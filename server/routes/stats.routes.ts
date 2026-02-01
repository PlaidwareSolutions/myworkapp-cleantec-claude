import { Router } from "express";
import { storage, getPagination } from "../storage";
import { authenticateMiddleware, authorizeMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { ASSET_STATES } from "@shared/schema";
import { db } from "../db";
import { orders, contacts, bols, bolTags, tags, assets, assetEvents } from "@shared/schema";
import { eq, and, inArray, ilike, or, sql, desc, count } from "drizzle-orm";

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
      const productId = Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId;
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

// Cycle Time Report - Order level data with asset drill-down capability
router.get(
  "/cycle-time",
  authenticateMiddleware,
  authorizeMiddleware(["Analytics"], ["OrderManagement"]),
  async (req, res, next) => {
    try {
      const view = (req.query.view as string) || "combined"; // active, closed, combined
      const threshold = parseInt(req.query.threshold as string) || 60;
      const search = (req.query.search as string) || "";
      const customerId = req.query.customerId as string;
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      // Define active and closed statuses
      // Active = APPROVED, SHIPPED, SHIPPED-PARTIAL (assets still out)
      // Closed = RETURNED, RECEIVED (assets returned)
      const activeStatuses = ["APPROVED", "SHIPPED", "SHIPPED-PARTIAL"];
      const closedStatuses = ["RETURNED", "RECEIVED", "RETURNED-PARTIAL"];

      // Build status filter based on view
      let statusFilter: string[] = [];
      if (view === "active") {
        statusFilter = activeStatuses;
      } else if (view === "closed") {
        statusFilter = closedStatuses;
      } else {
        statusFilter = [...activeStatuses, ...closedStatuses];
      }

      // Build conditions for query
      const conditions = [
        eq(orders.type, "OUTBOUND"),
        inArray(orders.status, statusFilter as any)
      ];

      // Date range filter
      if (dateFrom) {
        conditions.push(sql`${orders.shipDate} >= ${new Date(dateFrom)}`);
      }
      if (dateTo) {
        conditions.push(sql`${orders.shipDate} <= ${new Date(dateTo)}`);
      }

      // Customer filter
      if (customerId) {
        conditions.push(eq(orders.customerId, customerId));
      }

      // Search filter (order#, PO#)
      if (search) {
        conditions.push(
          or(
            ilike(orders.referenceId, `%${search}%`),
            ilike(orders.poNumber, `%${search}%`)
          )!
        );
      }

      // Get orders with customer data
      const ordersWithCustomer = await db
        .select({
          id: orders.id,
          referenceId: orders.referenceId,
          poNumber: orders.poNumber,
          status: orders.status,
          shipDate: orders.shipDate,
          customerId: orders.customerId,
          customerName: contacts.name,
          createdAt: orders.createdAt,
          updatedAt: orders.updatedAt,
        })
        .from(orders)
        .leftJoin(contacts, eq(orders.customerId, contacts.id))
        .where(and(...conditions))
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(skip);

      // Get total count
      const [countResult] = await db
        .select({ count: count() })
        .from(orders)
        .where(and(...conditions));

      const now = new Date();

      // Helper function to calculate cycle time for an order
      const calculateCycleTime = async (order: any): Promise<{ cycleDays: number; returnDate: Date | null; isActive: boolean }> => {
        let returnDate: Date | null = null;
        
        if (closedStatuses.includes(order.status as string)) {
          const returnEvents = await db
            .select({ createdAt: assetEvents.createdAt })
            .from(assetEvents)
            .where(
              and(
                eq(assetEvents.outboundOrderId, order.id),
                eq(assetEvents.state, "RETURNED"),
                eq(assetEvents.process, "RECEIVING")
              )
            )
            .orderBy(desc(assetEvents.createdAt))
            .limit(1);
          
          if (returnEvents.length > 0) {
            returnDate = returnEvents[0].createdAt;
          }
        }

        const outboundDate = order.shipDate || order.createdAt;
        let cycleDays = 0;
        
        if (outboundDate) {
          const endDate = returnDate || now;
          cycleDays = Math.floor((endDate.getTime() - new Date(outboundDate).getTime()) / (1000 * 60 * 60 * 24));
        }

        const isActive = activeStatuses.includes(order.status as string);
        return { cycleDays, returnDate, isActive };
      };

      // Calculate cycle time for paginated orders (for display)
      const ordersWithCycleTime = await Promise.all(
        ordersWithCustomer.map(async (order) => {
          const { cycleDays, returnDate, isActive } = await calculateCycleTime(order);
          const shippedCount = await storage.countAssetEventsByOrder(order.id, "ASSIGNED", "SHIPPING");

          return {
            orderId: order.id,
            orderNumber: order.referenceId,
            customerId: order.customerId,
            customerName: order.customerName,
            poNumber: order.poNumber,
            outboundDate: order.shipDate || order.createdAt,
            returnDate: returnDate,
            cycleDays,
            status: order.status,
            isActive,
            assetCount: shippedCount,
            exceedsThreshold: cycleDays > threshold,
          };
        })
      );

      // Calculate summary statistics from ALL orders (not just paginated)
      // Only fetch summary data if we have orders to process
      let summary = {
        avgCycleActive: 0,
        avgCycleClosed: 0,
        avgCycleCombined: 0,
        exceedsThresholdCount: 0,
        threshold,
        activeCount: 0,
        closedCount: 0,
        totalCount: 0,
      };

      const totalOrderCount = countResult?.count || 0;
      if (totalOrderCount > 0) {
        // Get ALL orders (no pagination) for summary calculation
        const allOrdersForSummary = await db
          .select({
            id: orders.id,
            status: orders.status,
            shipDate: orders.shipDate,
            createdAt: orders.createdAt,
          })
          .from(orders)
          .where(and(...conditions));

        let totalCycleActive = 0;
        let totalCycleClosed = 0;
        let activeCount = 0;
        let closedCount = 0;
        let exceedsCount = 0;

        await Promise.all(
          allOrdersForSummary.map(async (order) => {
            const { cycleDays, isActive } = await calculateCycleTime(order);
            
            if (isActive) {
              totalCycleActive += cycleDays;
              activeCount++;
            } else {
              totalCycleClosed += cycleDays;
              closedCount++;
            }
            
            if (cycleDays > threshold) {
              exceedsCount++;
            }
          })
        );

        summary = {
          avgCycleActive: activeCount > 0 ? Math.round(totalCycleActive / activeCount) : 0,
          avgCycleClosed: closedCount > 0 ? Math.round(totalCycleClosed / closedCount) : 0,
          avgCycleCombined: allOrdersForSummary.length > 0 
            ? Math.round((totalCycleActive + totalCycleClosed) / allOrdersForSummary.length) 
            : 0,
          exceedsThresholdCount: exceedsCount,
          threshold,
          activeCount,
          closedCount,
          totalCount: allOrdersForSummary.length,
        };
      }

      res.json({
        success: true,
        data: ordersWithCycleTime,
        summary,
        pagination: {
          page,
          limit,
          skip,
        },
        count: countResult?.count || 0,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get assets for a specific order (for drill-down)
router.get(
  "/cycle-time/order/:orderId/assets",
  authenticateMiddleware,
  authorizeMiddleware(["Analytics"], ["OrderManagement"]),
  async (req, res, next) => {
    try {
      const orderId = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
      const now = new Date();

      // Get the order first
      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      // Get all assets that were shipped with this order
      const shippedEvents = await db
        .select({
          assetId: assetEvents.assetId,
          shippedAt: assetEvents.createdAt,
        })
        .from(assetEvents)
        .where(
          and(
            eq(assetEvents.outboundOrderId, orderId),
            eq(assetEvents.state, "ASSIGNED"),
            eq(assetEvents.process, "SHIPPING")
          )
        );

      // For each asset, get the tag ID and check if returned
      const assetDetails = await Promise.all(
        shippedEvents.map(async (event) => {
          const asset = await storage.getAssetById(event.assetId);
          if (!asset) return null;

          const tag = await storage.getTagById(asset.tagId);

          // Check for return event
          const returnEvents = await db
            .select({ createdAt: assetEvents.createdAt })
            .from(assetEvents)
            .where(
              and(
                eq(assetEvents.assetId, event.assetId),
                eq(assetEvents.outboundOrderId, orderId),
                eq(assetEvents.state, "RETURNED"),
                eq(assetEvents.process, "RECEIVING")
              )
            )
            .orderBy(desc(assetEvents.createdAt))
            .limit(1);

          const returnDate = returnEvents.length > 0 ? returnEvents[0].createdAt : null;
          const outboundDate = event.shippedAt;
          const endDate = returnDate || now;
          const cycleDays = Math.floor((endDate.getTime() - new Date(outboundDate!).getTime()) / (1000 * 60 * 60 * 24));

          return {
            assetId: asset.id,
            tagId: asset.tagId,
            tagSerial: tag?.serial || null,
            outboundDate,
            returnDate,
            cycleDays,
            isReturned: returnDate !== null,
            lastState: asset.lastState,
          };
        })
      );

      res.json({
        success: true,
        data: assetDetails.filter(Boolean),
        order: {
          id: order.id,
          referenceId: order.referenceId,
          poNumber: order.poNumber,
          status: order.status,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// CSV export for cycle time report
router.get(
  "/cycle-time/export",
  authenticateMiddleware,
  authorizeMiddleware(["Analytics"], ["OrderManagement"]),
  async (req, res, next) => {
    try {
      const view = (req.query.view as string) || "combined";
      const threshold = parseInt(req.query.threshold as string) || 60;
      const search = (req.query.search as string) || "";
      const customerId = req.query.customerId as string;
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;

      const activeStatuses = ["APPROVED", "SHIPPED", "SHIPPED-PARTIAL"];
      const closedStatuses = ["RETURNED", "RECEIVED", "RETURNED-PARTIAL"];

      let statusFilter: string[] = [];
      if (view === "active") {
        statusFilter = activeStatuses;
      } else if (view === "closed") {
        statusFilter = closedStatuses;
      } else {
        statusFilter = [...activeStatuses, ...closedStatuses];
      }

      const conditions = [
        eq(orders.type, "OUTBOUND"),
        inArray(orders.status, statusFilter as any)
      ];

      if (dateFrom) {
        conditions.push(sql`${orders.shipDate} >= ${new Date(dateFrom)}`);
      }
      if (dateTo) {
        conditions.push(sql`${orders.shipDate} <= ${new Date(dateTo)}`);
      }
      if (customerId) {
        conditions.push(eq(orders.customerId, customerId));
      }
      if (search) {
        conditions.push(
          or(
            ilike(orders.referenceId, `%${search}%`),
            ilike(orders.poNumber, `%${search}%`)
          )!
        );
      }

      // Get all orders (no pagination for export)
      const ordersWithCustomer = await db
        .select({
          id: orders.id,
          referenceId: orders.referenceId,
          poNumber: orders.poNumber,
          status: orders.status,
          shipDate: orders.shipDate,
          customerId: orders.customerId,
          customerName: contacts.name,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .leftJoin(contacts, eq(orders.customerId, contacts.id))
        .where(and(...conditions))
        .orderBy(desc(orders.createdAt));

      const now = new Date();

      // Build CSV data
      const csvRows = await Promise.all(
        ordersWithCustomer.map(async (order) => {
          let returnDate: Date | null = null;
          
          if (closedStatuses.includes(order.status as string)) {
            const returnEvents = await db
              .select({ createdAt: assetEvents.createdAt })
              .from(assetEvents)
              .where(
                and(
                  eq(assetEvents.outboundOrderId, order.id),
                  eq(assetEvents.state, "RETURNED"),
                  eq(assetEvents.process, "RECEIVING")
                )
              )
              .orderBy(desc(assetEvents.createdAt))
              .limit(1);
            
            if (returnEvents.length > 0) {
              returnDate = returnEvents[0].createdAt;
            }
          }

          const outboundDate = order.shipDate || order.createdAt;
          let cycleDays = 0;
          
          if (outboundDate) {
            const endDate = returnDate || now;
            cycleDays = Math.floor((endDate.getTime() - new Date(outboundDate).getTime()) / (1000 * 60 * 60 * 24));
          }

          const shippedCount = await storage.countAssetEventsByOrder(order.id, "ASSIGNED", "SHIPPING");
          const isActive = activeStatuses.includes(order.status as string);

          return {
            "Order Number": order.referenceId || "",
            "Customer": order.customerName || "",
            "Customer PO": order.poNumber || "",
            "Outbound Date": outboundDate ? new Date(outboundDate).toISOString().split("T")[0] : "",
            "Return Date": returnDate ? new Date(returnDate).toISOString().split("T")[0] : "",
            "Cycle Days": cycleDays,
            "Status": isActive ? "Active" : "Closed",
            "Order Status": order.status || "",
            "Asset Count": shippedCount,
            "Exceeds Threshold": cycleDays > threshold ? "Yes" : "No",
          };
        })
      );

      // Build CSV string
      if (csvRows.length === 0) {
        return res.status(200).send("No data to export");
      }

      const headers = Object.keys(csvRows[0]);
      const csvContent = [
        headers.join(","),
        ...csvRows.map(row => headers.map(h => `"${(row as any)[h]}"`).join(","))
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="cycle-time-report-${view}-${new Date().toISOString().split("T")[0]}.csv"`);
      res.send(csvContent);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
