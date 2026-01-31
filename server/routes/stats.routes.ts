import { Router } from "express";
import { storage, getPagination } from "../storage";
import { authenticateMiddleware, authorizeMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { ASSET_STATES } from "@shared/schema";

const router = Router();

// Get order activity
router.get(
  "/activity/orders",
  authenticateMiddleware,
  authorizeMiddleware(["Analytics"], ["OrderManagement"]),
  async (req, res, next) => {
    try {
      const pagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      };

      const result = await storage.getAllOrderEvents(pagination);

      // Enhance with related data
      const eventsWithDetails = await Promise.all(result.data.map(async (event) => {
        const order = await storage.getOrderById(event.orderId);
        const createdBy = event.createdBy ? await storage.getContactById(event.createdBy) : null;
        const customer = order ? await storage.getContactById(order.customerId) : null;
        const carrier = order?.carrierId ? await storage.getContactById(order.carrierId) : null;

        return {
          ...event,
          createdBy: createdBy ? { id: createdBy.id, name: createdBy.name, email: createdBy.email, type: createdBy.type } : null,
          order: order ? {
            id: order.id,
            referenceId: order.referenceId,
            poNumber: order.poNumber,
            type: order.type,
            requiredDate: order.requiredDate,
            shipDate: order.shipDate,
            carrier: carrier ? { id: carrier.id, name: carrier.name, email: carrier.email } : null,
            customer: customer ? { id: customer.id, name: customer.name, email: customer.email } : null,
          } : null,
        };
      }));

      const paginationResult = getPagination(pagination);
      res.json({ success: true, data: eventsWithDetails, pagination: paginationResult, count: result.count });
    } catch (error) {
      next(error);
    }
  }
);

// Get product tag stats
router.get(
  "/product/:productId/tags",
  authenticateMiddleware,
  authorizeMiddleware(["Analytics"], ["OrderManagement"]),
  async (req, res, next) => {
    try {
      const productId = req.params.productId;
      const product = await storage.getProductById(productId);
      
      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }

      const counts = await storage.getProductAssetCounts(productId);
      
      res.json({
        success: true,
        data: {
          decommissioned: counts.decommissioned,
          available: counts.active,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get asset status breakdown
router.get(
  "/asset/status",
  authenticateMiddleware,
  authorizeMiddleware(["Analytics"], ["OrderManagement"]),
  async (req, res, next) => {
    try {
      const statusCounts = await storage.getAssetStatusCounts();
      
      // Ensure all states are represented
      const result: Record<string, number> = {};
      for (const state of ASSET_STATES) {
        result[state] = statusCounts[state] || 0;
      }

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Get assets by customer
router.get(
  "/asset/customer",
  authenticateMiddleware,
  authorizeMiddleware(["Analytics"], ["OrderManagement", "AssetManagement"]),
  async (req, res, next) => {
    try {
      // Get all outbound orders with shipped status
      const ordersResult = await storage.getOrders({
        type: "OUTBOUND",
        status: "SHIPPED,SHIPPED-PARTIAL,RETURNED-PARTIAL",
      }, { page: 1, limit: 1000 });

      const customerStats: Record<string, any> = {};

      for (const order of ordersResult.data) {
        const customerId = order.customerId;
        
        if (!customerStats[customerId]) {
          const customer = await storage.getContactById(customerId);
          customerStats[customerId] = {
            _id: customerId,
            customer: customer ? { id: customer.id, name: customer.name, email: customer.email } : null,
            orders: [],
            totalOrderCount: 0,
            totalShippedQuantity: 0,
            totalProcessingQuantity: 0,
            totalReturnedQuantity: 0,
            totalQuantityWithCustomer: 0,
          };
        }

        const shippedCount = await storage.countAssetEventsByOrder(order.id, "ASSIGNED", "SHIPPING");
        const processingCount = await storage.countAssetEventsByOrder(order.id, "PROCESSING", "PROCESSING");
        const returnedCount = await storage.countAssetEventsByOrder(order.id, "RETURNED", "RECEIVING");

        const quantityWithCustomer = shippedCount - returnedCount - (processingCount - returnedCount);

        if (quantityWithCustomer > 0) {
          customerStats[customerId].orders.push({
            _id: order.id,
            referenceId: order.referenceId,
            poNumber: order.poNumber,
            totalShippedQuantity: shippedCount,
            totalProcessingQuantity: processingCount,
            totalReturnedQuantity: returnedCount,
            totalQuantityWithCustomer: quantityWithCustomer,
          });

          customerStats[customerId].totalOrderCount++;
          customerStats[customerId].totalShippedQuantity += shippedCount;
          customerStats[customerId].totalProcessingQuantity += processingCount;
          customerStats[customerId].totalReturnedQuantity += returnedCount;
          customerStats[customerId].totalQuantityWithCustomer += quantityWithCustomer;
        }
      }

      const result = Object.values(customerStats).filter((c: any) => c.totalQuantityWithCustomer > 0);

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Get assets at processor
router.get(
  "/asset/processor",
  authenticateMiddleware,
  authorizeMiddleware(["Analytics"], ["OrderManagement", "AssetManagement"]),
  async (req, res, next) => {
    try {
      // Get all outbound orders with shipped status
      const ordersResult = await storage.getOrders({
        type: "OUTBOUND",
        status: "SHIPPED,SHIPPED-PARTIAL,RETURNED-PARTIAL",
      }, { page: 1, limit: 1000 });

      const stats = {
        orders: [] as any[],
        totalOrderCount: 0,
        totalProcessingQuantity: 0,
        totalReturnedQuantity: 0,
        totalQuantityWithProcessor: 0,
      };

      for (const order of ordersResult.data) {
        const processingCount = await storage.countAssetEventsByOrder(order.id, "PROCESSING", "PROCESSING");
        const returnedCount = await storage.countAssetEventsByOrder(order.id, "RETURNED", "RECEIVING");

        const quantityWithProcessor = processingCount - returnedCount;

        if (quantityWithProcessor > 0) {
          const customer = await storage.getContactById(order.customerId);
          
          stats.orders.push({
            _id: order.id,
            referenceId: order.referenceId,
            poNumber: order.poNumber,
            customer: customer ? { id: customer.id, name: customer.name, email: customer.email } : null,
            totalProcessingQuantity: processingCount,
            totalReturnedQuantity: returnedCount,
            totalQuantityWithProcessor: quantityWithProcessor,
          });

          stats.totalOrderCount++;
          stats.totalProcessingQuantity += processingCount;
          stats.totalReturnedQuantity += returnedCount;
          stats.totalQuantityWithProcessor += quantityWithProcessor;
        }
      }

      res.json({ success: true, data: [stats] });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
