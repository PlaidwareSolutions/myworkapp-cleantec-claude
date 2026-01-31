import { Router } from "express";
import { storage, getPagination } from "../storage";
import { authenticateMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { generateBolPdf } from "../services/pdf";
import { sendOrderNotificationEmail } from "../services/email";

const router = Router();

// Get BOLs
router.get("/bol", authenticateMiddleware, async (req, res, next) => {
  try {
    const filter: any = {};
    
    if (req.query.carrier) filter.carrierId = req.query.carrier as string;
    if (req.query.bolNumber) filter.referenceId = req.query.bolNumber as string;

    // Filter by order details
    if (req.query.orderPoNumber || req.query.orderNumber || req.query.customer) {
      const orderFilter: any = {};
      if (req.query.orderPoNumber) orderFilter.poNumber = req.query.orderPoNumber as string;
      if (req.query.orderNumber) orderFilter.referenceId = req.query.orderNumber as string;
      if (req.query.customer) orderFilter.customerId = req.query.customer as string;
      
      const orders = await storage.getOrders(orderFilter, { page: 1, limit: 1000 });
      filter.orderId = orders.data.map(o => o.id);
    }

    const pagination = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const result = await storage.getBols(filter, pagination);

    // Enhance with related data
    const bolsWithDetails = await Promise.all(result.data.map(async (bol) => {
      const carrier = await storage.getContactById(bol.carrierId);
      const order = await storage.getOrderById(bol.orderId);
      const customer = order ? await storage.getContactById(order.customerId) : null;

      return {
        ...bol,
        carrier: carrier ? { id: carrier.id, name: carrier.name } : null,
        order: order ? {
          id: order.id,
          referenceId: order.referenceId,
          poNumber: order.poNumber,
          customer: customer ? { id: customer.id, name: customer.name } : null,
        } : null,
      };
    }));

    const paginationResult = getPagination(pagination);
    res.json({ success: true, data: bolsWithDetails, pagination: paginationResult, count: result.count });
  } catch (error) {
    next(error);
  }
});

// Get BOL by ID
router.get("/bol/:id", authenticateMiddleware, async (req, res, next) => {
  try {
    const bolWithItems = await storage.getBolWithItems(req.params.id);
    if (!bolWithItems) {
      return res.status(404).json({ success: false, message: "BOL not found" });
    }

    const { bol, items, tags } = bolWithItems;
    const carrier = await storage.getContactById(bol.carrierId);
    const order = await storage.getOrderById(bol.orderId);
    const customer = order ? await storage.getContactById(order.customerId) : null;

    // Get product details for items
    const itemsWithProducts = await Promise.all(items.map(async (item) => {
      const product = await storage.getProductById(item.productId);
      return { ...item, product: product ? { id: product.id, name: product.name } : null };
    }));

    res.json({
      success: true,
      data: {
        ...bol,
        carrier: carrier ? { id: carrier.id, name: carrier.name } : null,
        order: order ? {
          id: order.id,
          referenceId: order.referenceId,
          poNumber: order.poNumber,
          customer: customer ? { id: customer.id, name: customer.name } : null,
        } : null,
        items: itemsWithProducts,
        tags,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get BOL PDF
router.get("/bol/:id/pdf", authenticateMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const bolWithItems = await storage.getBolWithItems(req.params.id);
    if (!bolWithItems) {
      return res.status(404).json({ success: false, message: "BOL not found" });
    }

    const { bol, items, tags } = bolWithItems;
    const carrier = await storage.getContactById(bol.carrierId);
    const order = await storage.getOrderById(bol.orderId);
    const customer = order ? await storage.getContactById(order.customerId) : null;
    const settings = await storage.getSettings();

    const pdfBuffer = await generateBolPdf(bol, items, carrier!, order!, customer!, settings);
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${bol.referenceId}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

// Update BOL tags
router.put("/bol/:id", authenticateMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const bol = await storage.getBolById(req.params.id);
    if (!bol) {
      return res.status(404).json({ success: false, message: "BOL not found" });
    }

    if (req.body.tags && Array.isArray(req.body.tags)) {
      await storage.updateBolTags(bol.id, req.body.tags);
    }

    const updatedBol = await storage.updateBol(req.params.id, { updatedBy: req.user!.id });
    res.json({ success: true, data: updatedBol });
  } catch (error) {
    next(error);
  }
});

// Create shipment
router.post("/shipment/create", authenticateMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!Array.isArray(req.body.bols) || req.body.bols.length === 0) {
      return res.status(400).json({ success: false, message: "Shipment must have at least one BOL" });
    }

    const createdBolIds: string[] = [];
    const orderIds: string[] = [];
    let orderType = "";

    // Check for duplicate tags across all BOLs
    if (req.body.bols.some((b: any) => b.tags?.length > 0)) {
      const allTags = new Set<string>();
      for (const bol of req.body.bols) {
        if (bol.tags) {
          for (const tag of bol.tags) {
            if (allTags.has(tag)) {
              return res.status(400).json({ success: false, message: "Duplicate tags found in shipment" });
            }
            allTags.add(tag);
          }
        }
      }
    }

    for (const bolData of req.body.bols) {
      const order = await storage.getOrderById(bolData.order || bolData.orderId);
      if (!order) {
        return res.status(400).json({ success: false, message: `Order not found: ${bolData.order || bolData.orderId}` });
      }

      if (orderType && order.type !== orderType) {
        return res.status(400).json({ success: false, message: "INBOUND and OUTBOUND orders cannot be mixed" });
      }
      orderType = order.type!;

      if (!["APPROVED", "SHIPPED-PARTIAL"].includes(order.status!)) {
        return res.status(400).json({ success: false, message: `Order ${order.referenceId} is in status: ${order.status}` });
      }

      let items: { productId: string; quantity: number }[] = [];
      const tagIds: string[] = bolData.tags || [];

      if (orderType === "INBOUND") {
        items = (bolData.items || []).filter((i: any) => (i.quantity || 0) > 0).map((i: any) => ({
          productId: i.product || i.productId,
          quantity: i.quantity,
        }));
      } else if (orderType === "OUTBOUND" && tagIds.length > 0) {
        // Get assets by tags and group by product
        const assets = await storage.getAssetsByTags(tagIds, ["CLEANED"]);
        if (assets.length !== tagIds.length) {
          return res.status(400).json({ success: false, message: "Could not resolve all scanned tags from active assets" });
        }

        // Group assets by product
        const productCounts: Record<string, { productId: string; quantity: number; assets: string[] }> = {};
        for (const asset of assets) {
          if (!productCounts[asset.productId]) {
            productCounts[asset.productId] = { productId: asset.productId, quantity: 0, assets: [] };
          }
          productCounts[asset.productId].quantity++;
          productCounts[asset.productId].assets.push(asset.id);
        }

        items = Object.values(productCounts).map(p => ({ productId: p.productId, quantity: p.quantity }));

        // Create asset events for shipped assets
        for (const asset of assets) {
          await storage.createAssetEvent({
            assetId: asset.id,
            outboundOrderId: order.id,
            state: "ASSIGNED",
            process: "SHIPPING",
            createdBy: req.user!.id,
          });
          await storage.updateAsset(asset.id, { lastState: "ASSIGNED" });
        }
      }

      const bol = await storage.createBol({
        carrierId: req.body.carrier || req.body.carrierId,
        orderId: order.id,
        orderType: order.type!,
        createdBy: req.user!.id,
      }, items, tagIds);

      createdBolIds.push(bol.id);
      orderIds.push(order.id);

      // Update order status
      const orderWithItems = await storage.getOrderWithItems(order.id);
      const shippedItems = await storage.getShippedItemsByOrder(order.id);
      const totalRequired = orderWithItems?.items.reduce((acc, i) => acc + (i.requiredQuantity || 0), 0) || 0;
      const totalShipped = shippedItems.reduce((acc, i) => acc + i.shippedQuantity, 0) + items.reduce((acc, i) => acc + i.quantity, 0);

      const newStatus = orderType === "OUTBOUND" && totalRequired > totalShipped ? "SHIPPED-PARTIAL" : "SHIPPED";
      
      await storage.updateOrder(order.id, { 
        status: newStatus,
        carrierId: req.body.carrier || req.body.carrierId,
      });

      await storage.createOrderEvent({
        orderId: order.id,
        status: newStatus,
        quantity: items.reduce((acc, i) => acc + i.quantity, 0),
        createdBy: req.user!.id,
      });
    }

    const shipment = await storage.createShipment({
      carrierId: req.body.carrier || req.body.carrierId,
      orderType: orderType as any,
      shipmentDate: req.body.shipmentDate ? new Date(req.body.shipmentDate) : new Date(),
      driverName: req.body.driver?.name,
      driverDl: req.body.driver?.dl,
      createdBy: req.user!.id,
    }, createdBolIds);

    // Update asset events with shipment ID
    for (const bolId of createdBolIds) {
      const bolWithItems = await storage.getBolWithItems(bolId);
      if (bolWithItems && bolWithItems.tags.length > 0) {
        for (const tagId of bolWithItems.tags) {
          const asset = await storage.getAssetByTag(tagId);
          if (asset) {
            const events = await storage.getAssetEvents(asset.id, 1);
            if (events.length > 0 && events[0].process === "SHIPPING") {
              // Update the event with shipment ID (would need a method for this)
            }
          }
        }
      }
    }

    // Send notifications
    for (const orderId of [...new Set(orderIds)]) {
      sendOrderNotificationEmail(orderId, "shipped").catch(console.error);
    }

    res.json({ success: true, data: shipment });
  } catch (error) {
    next(error);
  }
});

// Get shipments
router.get("/shipment", authenticateMiddleware, async (req, res, next) => {
  try {
    const filter: any = {};
    
    if (req.query.carrier) filter.carrierId = req.query.carrier as string;
    if (req.query.shipmentNumber) filter.referenceId = req.query.shipmentNumber as string;
    if (req.query.orderType) filter.orderType = req.query.orderType as string;

    const pagination = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const result = await storage.getShipments(filter, pagination);

    // Enhance with related data
    const shipmentsWithDetails = await Promise.all(result.data.map(async (shipment) => {
      const carrier = await storage.getContactById(shipment.carrierId);
      const shipmentWithBols = await storage.getShipmentWithBols(shipment.id);

      return {
        ...shipment,
        shipmentStatus: shipment.receivedDate ? "RECEIVED" : "SHIPPED",
        carrier: carrier ? { id: carrier.id, name: carrier.name } : null,
        bols: shipmentWithBols?.bolIds || [],
      };
    }));

    const paginationResult = getPagination(pagination);
    res.json({ success: true, data: shipmentsWithDetails, pagination: paginationResult, count: result.count });
  } catch (error) {
    next(error);
  }
});

// Get shipment by ID
router.get("/shipment/:id", authenticateMiddleware, async (req, res, next) => {
  try {
    const shipmentWithBols = await storage.getShipmentWithBols(req.params.id);
    if (!shipmentWithBols) {
      return res.status(404).json({ success: false, message: "Shipment not found" });
    }

    const { shipment, bolIds } = shipmentWithBols;
    const carrier = await storage.getContactById(shipment.carrierId);

    // Get BOL details
    const bolDetails = await Promise.all(bolIds.map(async (bolId) => {
      const bolWithItems = await storage.getBolWithItems(bolId);
      if (!bolWithItems) return null;
      const order = await storage.getOrderById(bolWithItems.bol.orderId);
      return {
        ...bolWithItems.bol,
        items: bolWithItems.items,
        tags: bolWithItems.tags,
        order: order ? { id: order.id, referenceId: order.referenceId, poNumber: order.poNumber } : null,
      };
    }));

    res.json({
      success: true,
      data: {
        ...shipment,
        shipmentStatus: shipment.receivedDate ? "RECEIVED" : "SHIPPED",
        carrier: carrier ? { id: carrier.id, name: carrier.name } : null,
        bols: bolDetails.filter(Boolean),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update shipment (mark as received)
router.put("/shipment/:id", authenticateMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const shipment = await storage.getShipmentById(req.params.id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: "Shipment not found" });
    }

    const updateData: any = { updatedBy: req.user!.id };
    
    if (req.body.receivedDate) {
      updateData.receivedDate = new Date(req.body.receivedDate);
    }

    const updatedShipment = await storage.updateShipment(req.params.id, updateData);
    res.json({ success: true, data: updatedShipment });
  } catch (error) {
    next(error);
  }
});

export default router;
