import { db } from "./db";
import { eq, and, or, ilike, sql, desc, asc, inArray, count, isNull, ne } from "drizzle-orm";
import {
  roles, contacts, products, tags, assets, assetEvents, orders, orderItems, orderEvents,
  bols, bolItems, bolTags, shipments, shipmentBols, settings, customFields,
  hierarchyLevels, hierarchyNodes, assetHierarchyNodes,
  InsertRole, Role, InsertContact, Contact, InsertProduct, Product, InsertTag, Tag,
  InsertAsset, Asset, InsertAssetEvent, AssetEvent, InsertOrder, Order, InsertOrderItem, OrderItem,
  InsertOrderEvent, OrderEvent, InsertBol, Bol, InsertBolItem, BolItem, InsertBolTag, BolTag,
  InsertShipment, Shipment, InsertShipmentBol, ShipmentBol, InsertSettings, Settings,
  InsertCustomField, CustomField, InsertHierarchyLevel, HierarchyLevel, InsertHierarchyNode, HierarchyNode,
  SYSTEM_RESERVED_ID
} from "@shared/schema";

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationResult {
  page: number;
  limit: number;
  skip: number;
}

export function getPagination(params: PaginationParams): PaginationResult {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

// Generate reference IDs
function generateReferenceId(prefix: string, id: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const suffix = id.slice(-6).toUpperCase();
  return `${prefix}-${year}-${month}-${suffix}`;
}

export interface IStorage {
  // Roles
  createRole(role: InsertRole): Promise<Role>;
  getRoles(filter?: { name?: string }): Promise<Role[]>;
  getRoleById(id: string): Promise<Role | undefined>;
  updateRole(id: string, data: Partial<InsertRole>): Promise<Role | undefined>;
  
  // Contacts
  createContact(contact: InsertContact): Promise<Contact>;
  getContacts(filter?: { name?: string; type?: string; active?: boolean | "all"; includeSystemUser?: boolean }, pagination?: PaginationParams): Promise<{ data: Contact[]; count: number }>;
  getContactById(id: string, includeSystemUser?: boolean): Promise<Contact | undefined>;
  getContactByUsername(username: string): Promise<Contact | undefined>;
  updateContact(id: string, data: Partial<InsertContact>): Promise<Contact | undefined>;
  getContactOrdersCount(contactId: string): Promise<number>;
  
  // Products
  createProduct(product: InsertProduct): Promise<Product>;
  getProducts(filter?: { name?: string; active?: boolean | "all"; customAttributes?: Record<string, any> }): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
  updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product | undefined>;
  getProductAssetCounts(productId: string): Promise<{ active: number; decommissioned: number }>;
  
  // Tags
  createTag(tag: InsertTag): Promise<Tag>;
  createTagsBulk(tags: InsertTag[]): Promise<Tag[]>;
  getTags(filter?: { epc?: string; serial?: string }, pagination?: PaginationParams): Promise<{ data: Tag[]; count: number }>;
  getTagById(id: string): Promise<Tag | undefined>;
  updateTag(id: string, data: Partial<InsertTag>): Promise<Tag | undefined>;
  
  // Assets
  createAsset(asset: InsertAsset): Promise<Asset>;
  getAssets(filter?: { productId?: string; active?: boolean | "all"; lastState?: string }, pagination?: PaginationParams): Promise<{ data: Asset[]; count: number }>;
  getAssetById(id: string): Promise<Asset | undefined>;
  getAssetByTag(tagId: string, activeOnly?: boolean): Promise<Asset | undefined>;
  getAssetsByTags(tagIds: string[], allowedStates?: string[]): Promise<Asset[]>;
  updateAsset(id: string, data: Partial<InsertAsset>): Promise<Asset | undefined>;
  
  // Asset Events
  createAssetEvent(event: InsertAssetEvent): Promise<AssetEvent>;
  createAssetEventsBulk(events: InsertAssetEvent[]): Promise<AssetEvent[]>;
  getAssetEvents(assetId: string, limit?: number): Promise<AssetEvent[]>;
  getAssetEventsByOrder(orderId: string, state?: string, process?: string): Promise<AssetEvent[]>;
  countAssetEventsByOrder(orderId: string, state: string, process: string): Promise<number>;
  
  // Orders
  createOrder(order: InsertOrder, items: { productId: string; requiredQuantity: number }[]): Promise<Order>;
  getOrders(filter?: any, pagination?: PaginationParams): Promise<{ data: Order[]; count: number }>;
  getOrderById(id: string): Promise<Order | undefined>;
  getOrderWithItems(id: string): Promise<{ order: Order; items: OrderItem[] } | undefined>;
  updateOrder(id: string, data: Partial<InsertOrder>): Promise<Order | undefined>;
  updateOrderItems(orderId: string, items: { productId: string; requiredQuantity: number }[]): Promise<void>;
  
  // Order Events
  createOrderEvent(event: InsertOrderEvent): Promise<OrderEvent>;
  getOrderEvents(orderId: string): Promise<OrderEvent[]>;
  getAllOrderEvents(pagination?: PaginationParams): Promise<{ data: OrderEvent[]; count: number }>;
  
  // BOLs
  createBol(bol: InsertBol, items: { productId: string; quantity: number }[], tagIds?: string[]): Promise<Bol>;
  getBols(filter?: any, pagination?: PaginationParams): Promise<{ data: Bol[]; count: number }>;
  getBolById(id: string): Promise<Bol | undefined>;
  getBolWithItems(id: string): Promise<{ bol: Bol; items: BolItem[]; tags: string[] } | undefined>;
  updateBol(id: string, data: Partial<InsertBol>): Promise<Bol | undefined>;
  updateBolTags(bolId: string, tagIds: string[]): Promise<void>;
  getShippedItemsByOrder(orderId: string): Promise<{ productId: string; shippedQuantity: number; bolIds: string[] }[]>;
  
  // Shipments
  createShipment(shipment: InsertShipment, bolIds: string[]): Promise<Shipment>;
  getShipments(filter?: any, pagination?: PaginationParams): Promise<{ data: Shipment[]; count: number }>;
  getShipmentById(id: string): Promise<Shipment | undefined>;
  getShipmentWithBols(id: string): Promise<{ shipment: Shipment; bolIds: string[] } | undefined>;
  getShipmentsByBolIds(bolIds: string[]): Promise<Shipment[]>;
  updateShipment(id: string, data: Partial<InsertShipment>): Promise<Shipment | undefined>;
  
  // Settings
  getSettings(): Promise<Settings | undefined>;
  upsertSettings(data: InsertSettings): Promise<Settings>;
  
  // Custom Fields
  createCustomField(field: InsertCustomField): Promise<CustomField>;
  getCustomFields(dataset?: string): Promise<CustomField[]>;
  
  // Hierarchy
  createHierarchyLevel(level: InsertHierarchyLevel): Promise<HierarchyLevel>;
  getHierarchyLevels(): Promise<HierarchyLevel[]>;
  createHierarchyNode(node: InsertHierarchyNode): Promise<HierarchyNode>;
  getHierarchyNodes(levelId?: string, parentId?: string): Promise<HierarchyNode[]>;
  
  // Stats
  getAssetStatusCounts(): Promise<Record<string, number>>;
}

export class DatabaseStorage implements IStorage {
  // Roles
  async createRole(role: InsertRole): Promise<Role> {
    const [result] = await db.insert(roles).values(role).returning();
    return result;
  }

  async getRoles(filter?: { name?: string }): Promise<Role[]> {
    const conditions = [];
    if (filter?.name) {
      conditions.push(ilike(roles.id, `%${filter.name}%`));
    }
    return await db.select().from(roles).where(conditions.length > 0 ? and(...conditions) : undefined);
  }

  async getRoleById(id: string): Promise<Role | undefined> {
    const [result] = await db.select().from(roles).where(eq(roles.id, id));
    return result;
  }

  async updateRole(id: string, data: Partial<InsertRole>): Promise<Role | undefined> {
    const [result] = await db.update(roles).set({ ...data, updatedAt: new Date() }).where(eq(roles.id, id)).returning();
    return result;
  }

  // Contacts
  async createContact(contact: InsertContact): Promise<Contact> {
    const [result] = await db.insert(contacts).values(contact).returning();
    return result;
  }

  async getContacts(filter?: { name?: string; type?: string; active?: boolean | "all"; includeSystemUser?: boolean }, pagination?: PaginationParams): Promise<{ data: Contact[]; count: number }> {
    const conditions = [];
    conditions.push(ne(contacts.id, SYSTEM_RESERVED_ID));
    
    if (filter?.active !== "all" && filter?.active !== undefined) {
      conditions.push(eq(contacts.active, filter.active));
    } else if (filter?.active === undefined) {
      conditions.push(eq(contacts.active, true));
    }
    
    if (filter?.name) {
      conditions.push(ilike(contacts.name, `%${filter.name}%`));
    }
    if (filter?.type) {
      conditions.push(eq(contacts.type, filter.type));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const { limit, skip } = getPagination(pagination || {});
    
    const data = await db.select().from(contacts).where(whereClause).orderBy(desc(contacts.createdAt)).limit(limit).offset(skip);
    const [countResult] = await db.select({ count: count() }).from(contacts).where(whereClause);
    
    return { data, count: countResult?.count || 0 };
  }

  async getContactById(id: string, includeSystemUser?: boolean): Promise<Contact | undefined> {
    const [result] = await db.select().from(contacts).where(eq(contacts.id, id));
    return result;
  }

  async getContactByUsername(username: string): Promise<Contact | undefined> {
    const [result] = await db.select().from(contacts).where(eq(contacts.systemUserUsername, username.toLowerCase()));
    return result;
  }

  async updateContact(id: string, data: Partial<InsertContact>): Promise<Contact | undefined> {
    const [result] = await db.update(contacts).set({ ...data, updatedAt: new Date() }).where(eq(contacts.id, id)).returning();
    return result;
  }

  async getContactOrdersCount(contactId: string): Promise<number> {
    const [result] = await db.select({ count: count() }).from(orders).where(eq(orders.customerId, contactId));
    return result?.count || 0;
  }

  // Products
  async createProduct(product: InsertProduct): Promise<Product> {
    const [result] = await db.insert(products).values(product).returning();
    return result;
  }

  async getProducts(filter?: { name?: string; active?: boolean | "all"; customAttributes?: Record<string, any> }): Promise<Product[]> {
    const conditions = [];
    
    if (filter?.active !== "all" && filter?.active !== undefined) {
      conditions.push(eq(products.active, filter.active));
    } else if (filter?.active === undefined) {
      conditions.push(eq(products.active, true));
    }
    
    if (filter?.name) {
      conditions.push(ilike(products.name, `%${filter.name}%`));
    }

    return await db.select().from(products).where(conditions.length > 0 ? and(...conditions) : undefined);
  }

  async getProductById(id: string): Promise<Product | undefined> {
    const [result] = await db.select().from(products).where(eq(products.id, id));
    return result;
  }

  async updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product | undefined> {
    const [result] = await db.update(products).set({ ...data, updatedAt: new Date() }).where(eq(products.id, id)).returning();
    return result;
  }

  async getProductAssetCounts(productId: string): Promise<{ active: number; decommissioned: number }> {
    const [activeResult] = await db.select({ count: count() }).from(assets).where(and(eq(assets.productId, productId), eq(assets.active, true)));
    const [decommissionedResult] = await db.select({ count: count() }).from(assets).where(and(eq(assets.productId, productId), eq(assets.active, false)));
    return { active: activeResult?.count || 0, decommissioned: decommissionedResult?.count || 0 };
  }

  // Tags
  async createTag(tag: InsertTag): Promise<Tag> {
    const [result] = await db.insert(tags).values(tag).returning();
    return result;
  }

  async createTagsBulk(tagList: InsertTag[]): Promise<Tag[]> {
    if (tagList.length === 0) return [];
    return await db.insert(tags).values(tagList).returning();
  }

  async getTags(filter?: { epc?: string; serial?: string }, pagination?: PaginationParams): Promise<{ data: Tag[]; count: number }> {
    const conditions = [];
    if (filter?.epc) {
      conditions.push(eq(tags.id, filter.epc));
    }
    if (filter?.serial) {
      conditions.push(eq(tags.serial, filter.serial));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const { limit, skip } = getPagination(pagination || {});
    
    const data = await db.select().from(tags).where(whereClause).limit(limit).offset(skip);
    const [countResult] = await db.select({ count: count() }).from(tags).where(whereClause);
    
    return { data, count: countResult?.count || 0 };
  }

  async getTagById(id: string): Promise<Tag | undefined> {
    const [result] = await db.select().from(tags).where(eq(tags.id, id));
    return result;
  }

  async updateTag(id: string, data: Partial<InsertTag>): Promise<Tag | undefined> {
    const [result] = await db.update(tags).set({ ...data, updatedAt: new Date() }).where(eq(tags.id, id)).returning();
    return result;
  }

  // Assets
  async createAsset(asset: InsertAsset): Promise<Asset> {
    const [result] = await db.insert(assets).values(asset).returning();
    return result;
  }

  async getAssets(filter?: { productId?: string; active?: boolean | "all"; lastState?: string }, pagination?: PaginationParams): Promise<{ data: Asset[]; count: number }> {
    const conditions = [];
    
    if (filter?.active !== "all" && filter?.active !== undefined) {
      conditions.push(eq(assets.active, filter.active));
    }
    
    if (filter?.productId) {
      conditions.push(eq(assets.productId, filter.productId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const { limit, skip } = getPagination(pagination || {});
    
    const data = await db.select().from(assets).where(whereClause).orderBy(desc(assets.createdAt)).limit(limit).offset(skip);
    const [countResult] = await db.select({ count: count() }).from(assets).where(whereClause);
    
    return { data, count: countResult?.count || 0 };
  }

  async getAssetById(id: string): Promise<Asset | undefined> {
    const [result] = await db.select().from(assets).where(eq(assets.id, id));
    return result;
  }

  async getAssetByTag(tagId: string, activeOnly?: boolean): Promise<Asset | undefined> {
    const conditions = [eq(assets.tagId, tagId)];
    if (activeOnly) {
      conditions.push(eq(assets.active, true));
    }
    const [result] = await db.select().from(assets).where(and(...conditions));
    return result;
  }

  async getAssetsByTags(tagIds: string[], allowedStates?: string[]): Promise<Asset[]> {
    const conditions = [eq(assets.active, true), inArray(assets.tagId, tagIds)];
    if (allowedStates && allowedStates.length > 0) {
      conditions.push(inArray(assets.lastState, allowedStates as any));
    }
    return await db.select().from(assets).where(and(...conditions));
  }

  async updateAsset(id: string, data: Partial<InsertAsset>): Promise<Asset | undefined> {
    const [result] = await db.update(assets).set({ ...data, updatedAt: new Date() }).where(eq(assets.id, id)).returning();
    return result;
  }

  // Asset Events
  async createAssetEvent(event: InsertAssetEvent): Promise<AssetEvent> {
    const [result] = await db.insert(assetEvents).values(event).returning();
    return result;
  }

  async createAssetEventsBulk(events: InsertAssetEvent[]): Promise<AssetEvent[]> {
    if (events.length === 0) return [];
    return await db.insert(assetEvents).values(events).returning();
  }

  async getAssetEvents(assetId: string, limit?: number): Promise<AssetEvent[]> {
    let query = db.select().from(assetEvents).where(eq(assetEvents.assetId, assetId)).orderBy(desc(assetEvents.createdAt));
    if (limit) {
      query = query.limit(limit) as any;
    }
    return await query;
  }

  async getAssetEventsByOrder(orderId: string, state?: string, process?: string): Promise<AssetEvent[]> {
    const conditions = [eq(assetEvents.outboundOrderId, orderId)];
    if (state) conditions.push(eq(assetEvents.state, state as any));
    if (process) conditions.push(eq(assetEvents.process, process as any));
    return await db.select().from(assetEvents).where(and(...conditions));
  }

  async countAssetEventsByOrder(orderId: string, state: string, process: string): Promise<number> {
    const [result] = await db.select({ count: count() }).from(assetEvents)
      .where(and(eq(assetEvents.outboundOrderId, orderId), eq(assetEvents.state, state as any), eq(assetEvents.process, process as any)));
    return result?.count || 0;
  }

  // Orders
  async createOrder(order: InsertOrder, items: { productId: string; requiredQuantity: number }[]): Promise<Order> {
    const [result] = await db.insert(orders).values(order).returning();
    const referenceId = generateReferenceId("ORD", result.id);
    await db.update(orders).set({ referenceId }).where(eq(orders.id, result.id));
    
    if (items.length > 0) {
      await db.insert(orderItems).values(items.map(item => ({ orderId: result.id, productId: item.productId, requiredQuantity: item.requiredQuantity })));
    }
    
    return { ...result, referenceId };
  }

  async getOrders(filter?: any, pagination?: PaginationParams): Promise<{ data: Order[]; count: number }> {
    const conditions = [];
    
    if (filter?.carrierId) conditions.push(eq(orders.carrierId, filter.carrierId));
    if (filter?.customerId) conditions.push(eq(orders.customerId, filter.customerId));
    if (filter?.createdBy) conditions.push(eq(orders.createdBy, filter.createdBy));
    if (filter?.type) conditions.push(eq(orders.type, filter.type));
    if (filter?.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : filter.status.split(",");
      conditions.push(inArray(orders.status, statuses));
    }
    if (filter?.poNumber) conditions.push(ilike(orders.poNumber, `%${filter.poNumber}%`));
    if (filter?.referenceId) conditions.push(ilike(orders.referenceId, `%${filter.referenceId}%`));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const { limit, skip } = getPagination(pagination || {});
    
    const data = await db.select().from(orders).where(whereClause).orderBy(desc(orders.createdAt)).limit(limit).offset(skip);
    const [countResult] = await db.select({ count: count() }).from(orders).where(whereClause);
    
    return { data, count: countResult?.count || 0 };
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    const [result] = await db.select().from(orders).where(eq(orders.id, id));
    return result;
  }

  async getOrderWithItems(id: string): Promise<{ order: Order; items: OrderItem[] } | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return undefined;
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    return { order, items };
  }

  async updateOrder(id: string, data: Partial<InsertOrder>): Promise<Order | undefined> {
    const [result] = await db.update(orders).set({ ...data, updatedAt: new Date() }).where(eq(orders.id, id)).returning();
    return result;
  }

  async updateOrderItems(orderId: string, items: { productId: string; requiredQuantity: number }[]): Promise<void> {
    await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
    if (items.length > 0) {
      await db.insert(orderItems).values(items.map(item => ({ orderId, productId: item.productId, requiredQuantity: item.requiredQuantity })));
    }
  }

  // Order Events
  async createOrderEvent(event: InsertOrderEvent): Promise<OrderEvent> {
    const [result] = await db.insert(orderEvents).values(event).returning();
    return result;
  }

  async getOrderEvents(orderId: string): Promise<OrderEvent[]> {
    return await db.select().from(orderEvents).where(eq(orderEvents.orderId, orderId)).orderBy(desc(orderEvents.createdAt));
  }

  async getAllOrderEvents(pagination?: PaginationParams): Promise<{ data: OrderEvent[]; count: number }> {
    const { limit, skip } = getPagination(pagination || {});
    const data = await db.select().from(orderEvents).orderBy(desc(orderEvents.createdAt)).limit(limit).offset(skip);
    const [countResult] = await db.select({ count: count() }).from(orderEvents);
    return { data, count: countResult?.count || 0 };
  }

  // BOLs
  async createBol(bol: InsertBol, items: { productId: string; quantity: number }[], tagIds?: string[]): Promise<Bol> {
    const [result] = await db.insert(bols).values(bol).returning();
    const referenceId = generateReferenceId("BOL", result.id);
    await db.update(bols).set({ referenceId }).where(eq(bols.id, result.id));
    
    if (items.length > 0) {
      await db.insert(bolItems).values(items.map(item => ({ bolId: result.id, productId: item.productId, quantity: item.quantity })));
    }
    
    if (tagIds && tagIds.length > 0) {
      await db.insert(bolTags).values(tagIds.map(tagId => ({ bolId: result.id, tagId })));
    }
    
    return { ...result, referenceId };
  }

  async getBols(filter?: any, pagination?: PaginationParams): Promise<{ data: Bol[]; count: number }> {
    const conditions = [];
    
    if (filter?.carrierId) conditions.push(eq(bols.carrierId, filter.carrierId));
    if (filter?.orderId) conditions.push(eq(bols.orderId, filter.orderId));
    if (filter?.referenceId) conditions.push(ilike(bols.referenceId, `%${filter.referenceId}%`));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const { limit, skip } = getPagination(pagination || {});
    
    const data = await db.select().from(bols).where(whereClause).orderBy(desc(bols.createdAt)).limit(limit).offset(skip);
    const [countResult] = await db.select({ count: count() }).from(bols).where(whereClause);
    
    return { data, count: countResult?.count || 0 };
  }

  async getBolById(id: string): Promise<Bol | undefined> {
    const [result] = await db.select().from(bols).where(eq(bols.id, id));
    return result;
  }

  async getBolWithItems(id: string): Promise<{ bol: Bol; items: BolItem[]; tags: string[] } | undefined> {
    const [bol] = await db.select().from(bols).where(eq(bols.id, id));
    if (!bol) return undefined;
    const items = await db.select().from(bolItems).where(eq(bolItems.bolId, id));
    const tagResults = await db.select().from(bolTags).where(eq(bolTags.bolId, id));
    return { bol, items, tags: tagResults.map(t => t.tagId) };
  }

  async updateBol(id: string, data: Partial<InsertBol>): Promise<Bol | undefined> {
    const [result] = await db.update(bols).set({ ...data, updatedAt: new Date() }).where(eq(bols.id, id)).returning();
    return result;
  }

  async updateBolTags(bolId: string, tagIds: string[]): Promise<void> {
    await db.delete(bolTags).where(eq(bolTags.bolId, bolId));
    if (tagIds.length > 0) {
      await db.insert(bolTags).values(tagIds.map(tagId => ({ bolId, tagId })));
    }
  }

  async getShippedItemsByOrder(orderId: string): Promise<{ productId: string; shippedQuantity: number; bolIds: string[] }[]> {
    const bolsForOrder = await db.select().from(bols).where(eq(bols.orderId, orderId));
    const bolIds = bolsForOrder.map(b => b.id);
    
    if (bolIds.length === 0) return [];
    
    const items = await db.select().from(bolItems).where(inArray(bolItems.bolId, bolIds));
    
    const grouped: Record<string, { productId: string; shippedQuantity: number; bolIds: Set<string> }> = {};
    for (const item of items) {
      if (!grouped[item.productId]) {
        grouped[item.productId] = { productId: item.productId, shippedQuantity: 0, bolIds: new Set() };
      }
      grouped[item.productId].shippedQuantity += item.quantity || 0;
      grouped[item.productId].bolIds.add(item.bolId);
    }
    
    return Object.values(grouped).map(g => ({ ...g, bolIds: Array.from(g.bolIds) }));
  }

  // Shipments
  async createShipment(shipment: InsertShipment, bolIds: string[]): Promise<Shipment> {
    const [result] = await db.insert(shipments).values(shipment).returning();
    const referenceId = generateReferenceId("SHIP", result.id);
    await db.update(shipments).set({ referenceId }).where(eq(shipments.id, result.id));
    
    if (bolIds.length > 0) {
      await db.insert(shipmentBols).values(bolIds.map(bolId => ({ shipmentId: result.id, bolId })));
    }
    
    return { ...result, referenceId };
  }

  async getShipments(filter?: any, pagination?: PaginationParams): Promise<{ data: Shipment[]; count: number }> {
    const conditions = [];
    
    if (filter?.carrierId) conditions.push(eq(shipments.carrierId, filter.carrierId));
    if (filter?.referenceId) conditions.push(ilike(shipments.referenceId, `%${filter.referenceId}%`));
    if (filter?.orderType) conditions.push(eq(shipments.orderType, filter.orderType));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const { limit, skip } = getPagination(pagination || {});
    
    const data = await db.select().from(shipments).where(whereClause).orderBy(desc(shipments.createdAt)).limit(limit).offset(skip);
    const [countResult] = await db.select({ count: count() }).from(shipments).where(whereClause);
    
    return { data, count: countResult?.count || 0 };
  }

  async getShipmentById(id: string): Promise<Shipment | undefined> {
    const [result] = await db.select().from(shipments).where(eq(shipments.id, id));
    return result;
  }

  async getShipmentWithBols(id: string): Promise<{ shipment: Shipment; bolIds: string[] } | undefined> {
    const [shipment] = await db.select().from(shipments).where(eq(shipments.id, id));
    if (!shipment) return undefined;
    const bolResults = await db.select().from(shipmentBols).where(eq(shipmentBols.shipmentId, id));
    return { shipment, bolIds: bolResults.map(b => b.bolId) };
  }

  async getShipmentsByBolIds(bolIds: string[]): Promise<Shipment[]> {
    if (bolIds.length === 0) return [];
    const shipmentBolResults = await db.select().from(shipmentBols).where(inArray(shipmentBols.bolId, bolIds));
    const shipmentIds = [...new Set(shipmentBolResults.map(sb => sb.shipmentId))];
    if (shipmentIds.length === 0) return [];
    return await db.select().from(shipments).where(inArray(shipments.id, shipmentIds));
  }

  async updateShipment(id: string, data: Partial<InsertShipment>): Promise<Shipment | undefined> {
    const [result] = await db.update(shipments).set({ ...data, updatedAt: new Date() }).where(eq(shipments.id, id)).returning();
    return result;
  }

  // Settings
  async getSettings(): Promise<Settings | undefined> {
    const [result] = await db.select().from(settings).limit(1);
    return result;
  }

  async upsertSettings(data: InsertSettings): Promise<Settings> {
    const existing = await this.getSettings();
    if (existing) {
      const [result] = await db.update(settings).set({ ...data, updatedAt: new Date() }).where(eq(settings.id, existing.id)).returning();
      return result;
    }
    const [result] = await db.insert(settings).values(data).returning();
    return result;
  }

  // Custom Fields
  async createCustomField(field: InsertCustomField): Promise<CustomField> {
    const [result] = await db.insert(customFields).values(field).returning();
    return result;
  }

  async getCustomFields(dataset?: string): Promise<CustomField[]> {
    if (dataset) {
      return await db.select().from(customFields).where(eq(customFields.dataset, dataset));
    }
    return await db.select().from(customFields);
  }

  // Hierarchy
  async createHierarchyLevel(level: InsertHierarchyLevel): Promise<HierarchyLevel> {
    const [result] = await db.insert(hierarchyLevels).values(level).returning();
    return result;
  }

  async getHierarchyLevels(): Promise<HierarchyLevel[]> {
    return await db.select().from(hierarchyLevels).orderBy(asc(hierarchyLevels.level));
  }

  async createHierarchyNode(node: InsertHierarchyNode): Promise<HierarchyNode> {
    const [result] = await db.insert(hierarchyNodes).values(node).returning();
    return result;
  }

  async getHierarchyNodes(levelId?: string, parentId?: string): Promise<HierarchyNode[]> {
    const conditions = [];
    if (levelId) conditions.push(eq(hierarchyNodes.levelId, levelId));
    if (parentId) conditions.push(eq(hierarchyNodes.parentId, parentId));
    return await db.select().from(hierarchyNodes).where(conditions.length > 0 ? and(...conditions) : undefined);
  }

  // Stats
  async getAssetStatusCounts(): Promise<Record<string, number>> {
    const results = await db.select({ state: assets.lastState, count: count() }).from(assets).groupBy(assets.lastState);
    const counts: Record<string, number> = {};
    for (const r of results) {
      if (r.state) counts[r.state] = r.count;
    }
    return counts;
  }
}

export const storage = new DatabaseStorage();
