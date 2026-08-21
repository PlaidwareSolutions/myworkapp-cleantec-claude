import { Router } from "express";
import { storage, getPagination } from "../storage";
import { authenticateMiddleware, authorizeMiddleware, loadAccessFiltersMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { generateOrderPdf } from "../services/pdf";
import { sendOrderNotificationEmail } from "../services/email";

const router = Router();

// Create order
router.post(
  "/create",
  authenticateMiddleware,
  authorizeMiddleware(["OrderCreateSelf"], ["OrderCreateAll", "OrderManagement"]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const settings = await storage.getSettings();
      const binsPerPallet = settings?.binsPerPallet || 48;
      const palletWeight = settings?.palletWeight || 50;
      const binWeight = settings?.binWeight || 5;

      // Aggregate items to avoid duplicates
      const items = req.body.items || [];
      if (!Array.isArray(items)) {
        return res.status(400).json({ success: false, message: "Items should be an array" });
      }

      const aggregatedItems: Record<string, number> = {};
      items.forEach((item: any) => {
        aggregatedItems[item.product || item.productId] = (aggregatedItems[item.product || item.productId] || 0) + (item.requiredQuantity || 0);
      });

      const finalItems = Object.entries(aggregatedItems).map(([productId, requiredQuantity]) => ({
        productId,
        requiredQuantity,
      }));

      // Calculate weights
      const totalItemsCount = finalItems.reduce((acc, item) => acc + item.requiredQuantity, 0);
      const palletCount = Math.ceil(totalItemsCount / binsPerPallet);
      const orderWeight = palletCount * palletWeight + totalItemsCount * binWeight;

      // Get customer type to determine order type
      const customer = await storage.getContactById(req.body.customer || req.body.customerId);
      if (!customer) {
        return res.status(400).json({ success: false, message: "Customer not found" });
      }

      // Check permissions for creating order for another contact
      const permissions = req.user!.permissions;
      const customerId = req.body.customer || req.body.customerId;
      if (!(permissions.admin || permissions.OrderCreateAll || permissions.OrderManagement)) {
        if (customerId !== req.user!.id) {
          return res.status(403).json({ success: false, message: "Cannot create order for another contact" });
        }
      }

      const orderType = req.body.type === "INBOUND" || req.body.type === "OUTBOUND"
        ? req.body.type
        : customer.type === "PROCESSOR" ? "INBOUND" : "OUTBOUND";

      const order = await storage.createOrder({
        poNumber: req.body.poNumber || "",
        palletCount,
        palletWeight,
        binWeight,
        orderWeight,
        carrierId: req.body.carrier || req.body.carrierId,
        customerId,
        type: orderType,
        status: "INITIATED",
        requiredDate: req.body.requiredDate ? new Date(req.body.requiredDate) : undefined,
        shipDate: req.body.shipDate ? new Date(req.body.shipDate) : undefined,
        receiverName: req.body.receiverAddress?.name,
        receiverAddressStreet: req.body.receiverAddress?.address?.street,
        receiverAddressCity: req.body.receiverAddress?.address?.city,
        receiverAddressState: req.body.receiverAddress?.address?.state,
        receiverAddressZipCode: req.body.receiverAddress?.address?.zipCode,
        receiverAddressCountry: req.body.receiverAddress?.address?.country,
        createdBy: req.user!.id,
      }, finalItems);

      // Create order event
      await storage.createOrderEvent({
        orderId: order.id,
        status: "INITIATED",
        requiredQuantity: totalItemsCount,
        quantity: 0,
        createdBy: req.user!.id,
      });

      // Send email notification
      sendOrderNotificationEmail(order.id, "created").catch(console.error);

      res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  }
);

// Get orders
router.get(
  "",
  authenticateMiddleware,
  authorizeMiddleware(["OrderViewSelf"], ["OrderViewAll", "OrderManagement"]),
  loadAccessFiltersMiddleware(["Order"]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const filter: any = {};
      
      if (req.query.carrier) filter.carrierId = req.query.carrier as string;
      if (req.query.customer) filter.customerId = req.query.customer as string;
      if (req.query.createdBy) filter.createdBy = req.query.createdBy as string;
      if (req.query.status) filter.status = req.query.status as string;
      if (req.query.type) filter.type = req.query.type as string;
      if (req.query.poNumber) filter.poNumber = req.query.poNumber as string;
      if (req.query.referenceId) filter.referenceId = req.query.referenceId as string;

      // Apply access filters for self-only permission
      const orderAccessFilter = res.locals.orderAccessFilter || [];
      if (orderAccessFilter.length > 0) {
        filter.customerId = req.user!.id;
      }

      const pagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      };

      const result = await storage.getOrders(filter, pagination);

      // Enhance with shipped items info
      const ordersWithDetails = await Promise.all(result.data.map(async (order) => {
        const shippedItems = await storage.getShippedItemsByOrder(order.id);
        const orderWithItems = await storage.getOrderWithItems(order.id);
        const items = orderWithItems?.items || [];
        
        const totalRequiredQuantity = items.reduce((acc, item) => acc + (item.requiredQuantity || 0), 0);
        const totalShippedQuantity = shippedItems.reduce((acc, item) => acc + item.shippedQuantity, 0);
        const totalReturnedQuantity = await storage.countAssetEventsByOrder(order.id, "RETURNED", "RECEIVING");

        const customer = await storage.getContactById(order.customerId);
        const carrier = order.carrierId ? await storage.getContactById(order.carrierId) : null;

        // Get shipped and returned dates from order events
        const orderEventsData = await storage.getOrderEvents(order.id);
        
        const shippedEvent = orderEventsData.find(e => 
          e.status === "SHIPPED" || e.status === "SHIPPED-PARTIAL"
        );
        const returnedEvent = orderEventsData.find(e => 
          e.status === "RETURNED" || e.status === "RETURNED-PARTIAL" || e.status === "MANUAL RECONCILIATION"
        );

        return {
          ...order,
          customer: customer ? { id: customer.id, name: customer.name, email: customer.email } : null,
          carrier: carrier ? { id: carrier.id, name: carrier.name, email: carrier.email } : null,
          items,
          shippedItems,
          totalRequiredQuantity,
          totalShippedQuantity,
          totalReturnedQuantity,
          shippedDate: shippedEvent?.createdAt || null,
          returnedDate: returnedEvent?.createdAt || null,
        };
      }));

      const paginationResult = getPagination(pagination);
      res.json({ success: true, data: ordersWithDetails, pagination: paginationResult, count: result.count });
    } catch (error) {
      next(error);
    }
  }
);

// Get order by ID
router.get(
  "/:id",
  authenticateMiddleware,
  authorizeMiddleware(["OrderViewSelf"], ["OrderViewAll", "OrderManagement"]),
  loadAccessFiltersMiddleware(["Order"]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const orderWithItems = await storage.getOrderWithItems(req.params.id);
      if (!orderWithItems) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      const { order, items } = orderWithItems;
      
      // Check access
      const orderAccessFilter = res.locals.orderAccessFilter || [];
      if (orderAccessFilter.length > 0) {
        if (order.customerId !== req.user!.id && order.createdBy !== req.user!.id) {
          return res.status(404).json({ success: false, message: "Order not found" });
        }
      }

      const shippedItems = await storage.getShippedItemsByOrder(order.id);
      const history = await storage.getOrderEvents(order.id);
      
      const customer = await storage.getContactById(order.customerId);
      const carrier = order.carrierId ? await storage.getContactById(order.carrierId) : null;
      const createdByContact = await storage.getContactById(order.createdBy);

      // Get shipping details
      const bolIds = shippedItems.flatMap(item => item.bolIds);
      const shippingDetails = await storage.getShipmentsByBolIds(bolIds);

      const totalRequiredQuantity = items.reduce((acc, item) => acc + (item.requiredQuantity || 0), 0);
      const totalShippedQuantity = shippedItems.reduce((acc, item) => acc + item.shippedQuantity, 0);

      // Get processor ping and return counts
      const totalProcessorPingQuantity = await storage.countAssetEventsByOrder(order.id, "PROCESSING", "PROCESSING");
      const totalReturnedQuantity = await storage.countAssetEventsByOrder(order.id, "RETURNED", "RECEIVING");

      res.json({
        success: true,
        data: {
          ...order,
          customer: customer ? { id: customer.id, name: customer.name, email: customer.email } : null,
          carrier: carrier ? { id: carrier.id, name: carrier.name, email: carrier.email } : null,
          createdBy: createdByContact ? { id: createdByContact.id, name: createdByContact.name, email: createdByContact.email } : null,
          items,
          shippedItems,
          shippingDetails,
          history,
          totalRequiredQuantity,
          totalShippedQuantity,
          totalProcessorPingQuantity,
          totalReturnedQuantity,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get order PDF
router.get("/:id/pdf", authenticateMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const orderWithItems = await storage.getOrderWithItems(req.params.id);
    if (!orderWithItems) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const { order, items } = orderWithItems;
    const customer = await storage.getContactById(order.customerId);
    const carrier = order.carrierId ? await storage.getContactById(order.carrierId) : null;

    const pdfBuffer = await generateOrderPdf(order, items, customer!, carrier);
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${order.referenceId}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

// Update order
router.put("/:id", authenticateMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const order = await storage.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.status !== "INITIATED") {
      return res.status(400).json({ success: false, message: "Order cannot be updated" });
    }

    const settings = await storage.getSettings();
    const binsPerPallet = settings?.binsPerPallet || 48;
    const palletWeight = settings?.palletWeight || 50;
    const binWeight = settings?.binWeight || 5;

    const customer = await storage.getContactById(order.customerId);
    const allowedKeys = ["requiredDate", "shipDate", "poNumber", "carrier", "carrierId"];
    if (customer?.type === "PROCESSOR") {
      allowedKeys.push("receiverName", "receiverAddressStreet", "receiverAddressCity", "receiverAddressState", "receiverAddressZipCode", "receiverAddressCountry");
    }

    const updateData: any = { updatedBy: req.user!.id };
    
    Object.keys(req.body).forEach(key => {
      if (allowedKeys.includes(key)) {
        if (key === "carrier") updateData.carrierId = req.body[key];
        else if (key === "requiredDate" || key === "shipDate") updateData[key] = new Date(req.body[key]);
        else updateData[key] = req.body[key];
      }
    });

    // Handle receiver address object
    if (req.body.receiverAddress) {
      updateData.receiverName = req.body.receiverAddress.name;
      updateData.receiverAddressStreet = req.body.receiverAddress.address?.street;
      updateData.receiverAddressCity = req.body.receiverAddress.address?.city;
      updateData.receiverAddressState = req.body.receiverAddress.address?.state;
      updateData.receiverAddressZipCode = req.body.receiverAddress.address?.zipCode;
      updateData.receiverAddressCountry = req.body.receiverAddress.address?.country;
    }

    // Update items if provided
    if (req.body.items && Array.isArray(req.body.items)) {
      const items = req.body.items.map((item: any) => ({
        productId: item.product || item.productId,
        requiredQuantity: item.requiredQuantity,
      }));
      await storage.updateOrderItems(order.id, items);

      // Recalculate weights
      const totalItemsCount = items.reduce((acc: number, item: any) => acc + item.requiredQuantity, 0);
      updateData.palletCount = Math.ceil(totalItemsCount / binsPerPallet);
      updateData.palletWeight = palletWeight;
      updateData.binWeight = binWeight;
      updateData.orderWeight = updateData.palletCount * palletWeight + totalItemsCount * binWeight;
    }

    const updatedOrder = await storage.updateOrder(req.params.id, updateData);
    res.json({ success: true, data: updatedOrder });
  } catch (error) {
    next(error);
  }
});

// Approve order
router.post("/:id/approve", authenticateMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const order = await storage.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.status !== "INITIATED") {
      return res.status(400).json({ success: false, message: "Order cannot be approved" });
    }

    const updatedOrder = await storage.updateOrder(req.params.id, {
      status: "APPROVED",
      updatedBy: req.user!.id,
    });

    await storage.createOrderEvent({
      orderId: order.id,
      status: "APPROVED",
      createdBy: req.user!.id,
    });

    sendOrderNotificationEmail(order.id, "approved").catch(console.error);

    res.json({ success: true, data: updatedOrder });
  } catch (error) {
    next(error);
  }
});

// Cancel order
router.post("/:id/cancel", authenticateMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const order = await storage.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (!["INITIATED", "APPROVED"].includes(order.status!)) {
      return res.status(400).json({ success: false, message: "Order cannot be cancelled" });
    }

    const updatedOrder = await storage.updateOrder(req.params.id, {
      status: "CANCELLED",
      updatedBy: req.user!.id,
    });

    await storage.createOrderEvent({
      orderId: order.id,
      status: "CANCELLED",
      comment: req.body?.reason,
      createdBy: req.user!.id,
    });

    sendOrderNotificationEmail(order.id, "cancelled").catch(console.error);

    res.json({ success: true, data: updatedOrder });
  } catch (error) {
    next(error);
  }
});

// Revoke order approval
router.post("/:id/revoke", authenticateMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const order = await storage.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.status !== "APPROVED") {
      return res.status(400).json({ success: false, message: "Only approved orders can be revoked" });
    }

    const updatedOrder = await storage.updateOrder(req.params.id, {
      status: "INITIATED",
      updatedBy: req.user!.id,
    });

    await storage.createOrderEvent({
      orderId: order.id,
      status: "INITIATED",
      comment: "Approval revoked",
      createdBy: req.user!.id,
    });

    res.json({ success: true, message: "Order approval revoked", data: updatedOrder });
  } catch (error) {
    next(error);
  }
});

export default router;
