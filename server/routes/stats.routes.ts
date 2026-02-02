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

// Tote Status Report - RTU / Dirty / In Use / Damaged
const TOTE_STATUS_CATEGORIES = {
  rtu: ["CLEANED"],           // Ready To Use
  dirty: ["RETURNED", "FIXED"], // Dirty - needs cleaning
  inuse: ["ASSIGNED", "PROCESSING"], // In Use - out in field
  damaged: ["DAMAGED"],       // Damaged - needs repair
} as const;

router.get(
  "/tote-status",
  authenticateMiddleware,
  authorizeMiddleware(["Analytics"], ["OrderManagement"]),
  async (req, res, next) => {
    try {
      const category = (req.query.category as string) || "rtu";
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;
      const search = req.query.search as string;
      const customerId = req.query.customerId as string;
      const carrierId = req.query.carrierId as string;
      const inspectionDateFrom = req.query.inspectionDateFrom as string;
      const inspectionDateTo = req.query.inspectionDateTo as string;

      // Get the states for the selected category
      const categoryStates = TOTE_STATUS_CATEGORIES[category as keyof typeof TOTE_STATUS_CATEGORIES] || TOTE_STATUS_CATEGORIES.rtu;

      // Build conditions for assets based on their current state
      const conditions: any[] = [
        inArray(assets.lastState, [...categoryStates] as any),
      ];

      // Search by tag ID
      if (search) {
        conditions.push(
          or(
            ilike(tags.id, `%${search}%`),
            ilike(tags.serial, `%${search}%`)
          )
        );
      }

      // Get assets with their tags and related info
      const assetsQuery = db
        .select({
          assetId: assets.id,
          tagId: tags.id,
          tagSerial: tags.serial,
          lastState: assets.lastState,
          updatedAt: assets.updatedAt,
          createdAt: assets.createdAt,
        })
        .from(assets)
        .innerJoin(tags, eq(assets.tagId, tags.id))
        .where(and(...conditions));

      // For filtered queries (customer/carrier/date), we need to fetch all and filter in JS
      // then paginate the results - this is because these filters require event lookups
      const hasAdvancedFilters = customerId || carrierId || inspectionDateFrom || inspectionDateTo;
      
      // Get all assets for filtering (or paginated if no advanced filters)
      const assetResults = hasAdvancedFilters 
        ? await assetsQuery.orderBy(desc(assets.updatedAt))
        : await assetsQuery.orderBy(desc(assets.updatedAt)).limit(limit).offset(skip);

      const now = new Date();

      // Enhance each asset with additional details
      const assetsWithDetails = await Promise.all(
        assetResults.map(async (asset) => {
          // Get latest inspection event
          const latestInspection = await db
            .select({
              createdAt: assetEvents.createdAt,
              createdBy: assetEvents.createdBy,
            })
            .from(assetEvents)
            .where(
              and(
                eq(assetEvents.assetId, asset.assetId),
                eq(assetEvents.process, "INSPECTION")
              )
            )
            .orderBy(desc(assetEvents.createdAt))
            .limit(1);

          let inspectionDate: Date | null = null;
          let inspectedBy: string | null = null;

          if (latestInspection.length > 0) {
            inspectionDate = latestInspection[0].createdAt;
            if (latestInspection[0].createdBy) {
              const inspector = await storage.getContactById(latestInspection[0].createdBy);
              inspectedBy = inspector?.name || null;
            }
          }

          // Apply inspection date filters if provided
          if (inspectionDateFrom && inspectionDate) {
            const fromDate = new Date(inspectionDateFrom);
            if (inspectionDate < fromDate) return null;
          }
          if (inspectionDateTo && inspectionDate) {
            const toDate = new Date(inspectionDateTo);
            toDate.setHours(23, 59, 59, 999);
            if (inspectionDate > toDate) return null;
          }

          // Get usage count (number of completed cycles - RETURNED events)
          const [usageCountResult] = await db
            .select({ count: count() })
            .from(assetEvents)
            .where(
              and(
                eq(assetEvents.assetId, asset.assetId),
                eq(assetEvents.state, "RETURNED"),
                eq(assetEvents.process, "RECEIVING")
              )
            );
          const usageCount = usageCountResult?.count || 0;

          // Get last use date (most recent ASSIGNED event)
          const lastAssignment = await db
            .select({
              createdAt: assetEvents.createdAt,
              outboundOrderId: assetEvents.outboundOrderId,
            })
            .from(assetEvents)
            .where(
              and(
                eq(assetEvents.assetId, asset.assetId),
                eq(assetEvents.state, "ASSIGNED"),
                eq(assetEvents.process, "SHIPPING")
              )
            )
            .orderBy(desc(assetEvents.createdAt))
            .limit(1);

          let lastUseDate: Date | null = null;
          let lastCustomerId: string | null = null;
          let lastCustomerName: string | null = null;
          let currentOrderId: string | null = null;
          let currentOrderNumber: string | null = null;
          let assignedDate: Date | null = null;

          if (lastAssignment.length > 0) {
            lastUseDate = lastAssignment[0].createdAt;
            
            if (lastAssignment[0].outboundOrderId) {
              const order = await storage.getOrderById(lastAssignment[0].outboundOrderId);
              if (order) {
                const customer = await storage.getContactById(order.customerId);
                lastCustomerId = order.customerId;
                lastCustomerName = customer?.name || null;

                // For "In Use" totes, this is the current order
                if ((categoryStates as readonly string[]).includes("ASSIGNED") || (categoryStates as readonly string[]).includes("PROCESSING")) {
                  currentOrderId = order.id;
                  currentOrderNumber = order.referenceId;
                  assignedDate = lastAssignment[0].createdAt;
                }
              }
            }
          }

          // Apply customer filter if provided
          if (customerId && lastCustomerId !== customerId) {
            return null;
          }

          // Apply carrier filter if provided
          if (carrierId) {
            // Check if the last order had this carrier
            if (lastAssignment.length > 0 && lastAssignment[0].outboundOrderId) {
              const order = await storage.getOrderById(lastAssignment[0].outboundOrderId);
              if (!order || order.carrierId !== carrierId) {
                return null;
              }
            } else {
              return null;
            }
          }

          return {
            assetId: asset.assetId,
            tagId: asset.tagId,
            tagSerial: asset.tagSerial,
            state: asset.lastState,
            inspectionDate,
            inspectedBy,
            usageCount,
            lastUseDate,
            lastCustomerId,
            lastCustomerName,
            currentOrderId,
            currentOrderNumber,
            assignedDate,
          };
        })
      );

      // Filter out nulls (filtered by date/customer/carrier)
      const filteredAssets = assetsWithDetails.filter(Boolean);
      
      // For advanced filters, paginate the filtered results and compute accurate counts
      let paginatedAssets = filteredAssets;
      let filteredCount = filteredAssets.length;
      
      if (hasAdvancedFilters) {
        // Paginate the filtered results
        paginatedAssets = filteredAssets.slice(skip, skip + limit);
      } else {
        // Get total count from DB for non-advanced filter case
        const [countResult] = await db
          .select({ count: count() })
          .from(assets)
          .innerJoin(tags, eq(assets.tagId, tags.id))
          .where(and(...conditions));
        filteredCount = countResult?.count || 0;
      }

      // Get the unfiltered category total for context (how many total in this state)
      const [categoryTotal] = await db
        .select({ count: count() })
        .from(assets)
        .where(inArray(assets.lastState, [...categoryStates] as any));

      res.json({
        success: true,
        data: paginatedAssets,
        summary: {
          totalCount: filteredCount, // Shows filtered count when filters applied
          categoryTotal: categoryTotal?.count || 0, // Total in this category regardless of filters
          category,
          categoryLabel: category === "rtu" ? "Ready To Use" : category === "dirty" ? "Dirty" : category === "damaged" ? "Damaged" : "In Use",
        },
        pagination: {
          page,
          limit,
          skip,
        },
        count: filteredCount,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Tote Status Export (CSV)
router.get(
  "/tote-status/export",
  authenticateMiddleware,
  authorizeMiddleware(["Analytics"], ["OrderManagement"]),
  async (req, res, next) => {
    try {
      const category = (req.query.category as string) || "rtu";
      const search = req.query.search as string;
      const customerId = req.query.customerId as string;
      const carrierId = req.query.carrierId as string;
      const inspectionDateFrom = req.query.inspectionDateFrom as string;
      const inspectionDateTo = req.query.inspectionDateTo as string;

      const categoryStates = TOTE_STATUS_CATEGORIES[category as keyof typeof TOTE_STATUS_CATEGORIES] || TOTE_STATUS_CATEGORIES.rtu;

      const conditions: any[] = [
        inArray(assets.lastState, [...categoryStates] as any),
      ];

      if (search) {
        conditions.push(
          or(
            ilike(tags.id, `%${search}%`),
            ilike(tags.serial, `%${search}%`)
          )
        );
      }

      // Get all assets (no pagination for export)
      const assetResults = await db
        .select({
          assetId: assets.id,
          tagId: tags.id,
          tagSerial: tags.serial,
          lastState: assets.lastState,
          updatedAt: assets.updatedAt,
        })
        .from(assets)
        .innerJoin(tags, eq(assets.tagId, tags.id))
        .where(and(...conditions))
        .orderBy(desc(assets.updatedAt));

      // Build CSV rows with full details
      const csvRows = await Promise.all(
        assetResults.map(async (asset) => {
          // Get latest inspection
          const latestInspection = await db
            .select({
              createdAt: assetEvents.createdAt,
              createdBy: assetEvents.createdBy,
            })
            .from(assetEvents)
            .where(
              and(
                eq(assetEvents.assetId, asset.assetId),
                eq(assetEvents.process, "INSPECTION")
              )
            )
            .orderBy(desc(assetEvents.createdAt))
            .limit(1);

          let inspectionDate: Date | null = null;
          let inspectedBy: string | null = null;

          if (latestInspection.length > 0) {
            inspectionDate = latestInspection[0].createdAt;
            if (latestInspection[0].createdBy) {
              const inspector = await storage.getContactById(latestInspection[0].createdBy);
              inspectedBy = inspector?.name || null;
            }
          }

          // Apply inspection date filters
          if (inspectionDateFrom && inspectionDate) {
            const fromDate = new Date(inspectionDateFrom);
            if (inspectionDate < fromDate) return null;
          }
          if (inspectionDateTo && inspectionDate) {
            const toDate = new Date(inspectionDateTo);
            toDate.setHours(23, 59, 59, 999);
            if (inspectionDate > toDate) return null;
          }

          // Get usage count
          const [usageCountResult] = await db
            .select({ count: count() })
            .from(assetEvents)
            .where(
              and(
                eq(assetEvents.assetId, asset.assetId),
                eq(assetEvents.state, "RETURNED"),
                eq(assetEvents.process, "RECEIVING")
              )
            );
          const usageCount = usageCountResult?.count || 0;

          // Get last assignment
          const lastAssignment = await db
            .select({
              createdAt: assetEvents.createdAt,
              outboundOrderId: assetEvents.outboundOrderId,
            })
            .from(assetEvents)
            .where(
              and(
                eq(assetEvents.assetId, asset.assetId),
                eq(assetEvents.state, "ASSIGNED"),
                eq(assetEvents.process, "SHIPPING")
              )
            )
            .orderBy(desc(assetEvents.createdAt))
            .limit(1);

          let lastUseDate: Date | null = null;
          let lastCustomerId: string | null = null;
          let lastCustomerName: string | null = null;
          let currentOrderNumber: string | null = null;
          let assignedDate: Date | null = null;

          if (lastAssignment.length > 0) {
            lastUseDate = lastAssignment[0].createdAt;
            
            if (lastAssignment[0].outboundOrderId) {
              const order = await storage.getOrderById(lastAssignment[0].outboundOrderId);
              if (order) {
                const customer = await storage.getContactById(order.customerId);
                lastCustomerId = order.customerId;
                lastCustomerName = customer?.name || null;

                if ((categoryStates as readonly string[]).includes("ASSIGNED") || (categoryStates as readonly string[]).includes("PROCESSING")) {
                  currentOrderNumber = order.referenceId;
                  assignedDate = lastAssignment[0].createdAt;
                }
              }
            }
          }

          // Apply filters
          if (customerId && lastCustomerId !== customerId) return null;
          if (carrierId) {
            if (lastAssignment.length > 0 && lastAssignment[0].outboundOrderId) {
              const order = await storage.getOrderById(lastAssignment[0].outboundOrderId);
              if (!order || order.carrierId !== carrierId) return null;
            } else {
              return null;
            }
          }

          return {
            "Tote ID": asset.tagId || "",
            "Serial Number": asset.tagSerial || "",
            "State": asset.lastState || "",
            "Inspection Date": inspectionDate ? new Date(inspectionDate).toISOString().split("T")[0] : "",
            "Inspected By": inspectedBy || "",
            "Usage Count": usageCount,
            "Last Use Date": lastUseDate ? new Date(lastUseDate).toISOString().split("T")[0] : "",
            "Last Customer": lastCustomerName || "",
            "Current Order": currentOrderNumber || "",
            "Assigned Date": assignedDate ? new Date(assignedDate).toISOString().split("T")[0] : "",
          };
        })
      );

      const filteredRows = csvRows.filter(Boolean);

      if (filteredRows.length === 0) {
        return res.status(200).send("No data to export");
      }

      const headers = Object.keys(filteredRows[0]!);
      const csvContent = [
        headers.join(","),
        ...filteredRows.map(row => headers.map(h => `"${(row as any)[h]}"`).join(","))
      ].join("\n");

      const categoryLabel = category === "rtu" ? "ready-to-use" : category === "dirty" ? "dirty" : category === "damaged" ? "damaged" : "in-use";
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="tote-status-${categoryLabel}-${new Date().toISOString().split("T")[0]}.csv"`);
      res.send(csvContent);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
