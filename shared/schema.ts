import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer, timestamp, jsonb, real, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enums
export const tagStateEnum = pgEnum("tag_state", ["COMMISSIONED", "AVAILABLE", "DECOMMISSIONED"]);
export const assetStateEnum = pgEnum("asset_state", ["CLEANED", "ASSIGNED", "PROCESSING", "RETURNED", "DAMAGED", "FIXED", "DECOMMISSIONED"]);
export const assetProcessEnum = pgEnum("asset_process", ["COMMISSIONING", "SHIPPING", "RECEIVING", "PROCESSING", "INSPECTION"]);
export const orderTypeEnum = pgEnum("order_type", ["OUTBOUND", "INBOUND"]);
export const orderStatusEnum = pgEnum("order_status", [
  "INITIATED", "APPROVED", "SHIPPED-PARTIAL", "SHIPPED", "RECEIVED", "RETURNED", "RETURNED-PARTIAL", "CANCELLED", "MANUAL RECONCILIATION"
]);

// Roles table
export const roles = pgTable("roles", {
  id: varchar("id", { length: 50 }).primaryKey(),
  permissions: jsonb("permissions").$type<Record<string, boolean>>().default({}),
  createdBy: varchar("created_by", { length: 36 }),
  updatedBy: varchar("updated_by", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRoleSchema = createInsertSchema(roles).omit({ createdAt: true, updatedAt: true });
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;

// Contacts table (includes system user auth)
export const contacts = pgTable("contacts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 50 }).notNull().references(() => roles.id),
  active: boolean("active").default(true),
  name: text("name").notNull(),
  phone: text("phone").array().notNull(),
  email: text("email").array().notNull(),
  notification: boolean("notification").default(false),
  businessDetails: text("business_details"),
  profilePicture: text("profile_picture"),
  customAttributes: jsonb("custom_attributes").$type<Record<string, any>>().default({}),
  // Address fields
  addressStreet: text("address_street"),
  addressCity: text("address_city"),
  addressState: text("address_state"),
  addressZipCode: text("address_zip_code"),
  addressCountry: text("address_country"),
  // System user fields (for authentication)
  systemUserActive: boolean("system_user_active"),
  systemUserUsername: varchar("system_user_username", { length: 255 }).unique(),
  systemUserPasswordHash: text("system_user_password_hash"),
  systemUserPasswordLastChanged: timestamp("system_user_password_last_changed"),
  systemUserLastLogin: timestamp("system_user_last_login"),
  systemUserCreatedBy: varchar("system_user_created_by", { length: 36 }),
  systemUserUpdatedBy: varchar("system_user_updated_by", { length: 36 }),
  createdBy: varchar("created_by", { length: 36 }),
  updatedBy: varchar("updated_by", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertContactSchema = createInsertSchema(contacts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;

// Products table
export const products = pgTable("products", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  weight: real("weight").default(0),
  active: boolean("active").default(false),
  customAttributes: jsonb("custom_attributes").$type<Record<string, any>>().default({}),
  createdBy: varchar("created_by", { length: 36 }),
  updatedBy: varchar("updated_by", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// Tags table
export const tags = pgTable("tags", {
  id: varchar("id", { length: 255 }).primaryKey(), // EPC code
  serial: varchar("serial", { length: 255 }),
  type: varchar("type", { length: 100 }),
  model: varchar("model", { length: 100 }),
  provider: varchar("provider", { length: 100 }),
  brand: varchar("brand", { length: 100 }),
  upc: varchar("upc", { length: 100 }),
  state: tagStateEnum("state").default("COMMISSIONED"),
  customAttributes: jsonb("custom_attributes").$type<Record<string, any>>().default({}),
  createdBy: varchar("created_by", { length: 36 }),
  updatedBy: varchar("updated_by", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTagSchema = createInsertSchema(tags).omit({ createdAt: true, updatedAt: true });
export type InsertTag = z.infer<typeof insertTagSchema>;
export type Tag = typeof tags.$inferSelect;

// Assets table
export const assets = pgTable("assets", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id", { length: 36 }).notNull().references(() => products.id),
  tagId: varchar("tag_id", { length: 255 }).notNull().references(() => tags.id),
  active: boolean("active").default(true),
  lastState: assetStateEnum("last_state").default("CLEANED"),
  createdBy: varchar("created_by", { length: 36 }),
  updatedBy: varchar("updated_by", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAssetSchema = createInsertSchema(assets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assets.$inferSelect;

// Asset Events table
export const assetEvents = pgTable("asset_events", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id", { length: 36 }).notNull().references(() => assets.id),
  state: assetStateEnum("state").notNull(),
  process: assetProcessEnum("process").notNull(),
  comment: text("comment"),
  outboundOrderId: varchar("outbound_order_id", { length: 36 }),
  shipmentId: varchar("shipment_id", { length: 36 }),
  createdBy: varchar("created_by", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAssetEventSchema = createInsertSchema(assetEvents).omit({ id: true, createdAt: true });
export type InsertAssetEvent = z.infer<typeof insertAssetEventSchema>;
export type AssetEvent = typeof assetEvents.$inferSelect;

// Orders table
export const orders = pgTable("orders", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  referenceId: varchar("reference_id", { length: 50 }),
  poNumber: varchar("po_number", { length: 100 }).default(""),
  palletCount: integer("pallet_count").default(0),
  palletWeight: real("pallet_weight").default(0),
  binWeight: real("bin_weight").default(0),
  orderWeight: real("order_weight").default(0),
  carrierId: varchar("carrier_id", { length: 36 }).references(() => contacts.id),
  customerId: varchar("customer_id", { length: 36 }).notNull().references(() => contacts.id),
  type: orderTypeEnum("type").notNull(),
  status: orderStatusEnum("status").default("INITIATED"),
  requiredDate: timestamp("required_date"),
  shipDate: timestamp("ship_date"),
  pdfKey: text("pdf_key"),
  // Receiver address
  receiverName: text("receiver_name"),
  receiverAddressStreet: text("receiver_address_street"),
  receiverAddressCity: text("receiver_address_city"),
  receiverAddressState: text("receiver_address_state"),
  receiverAddressZipCode: text("receiver_address_zip_code"),
  receiverAddressCountry: text("receiver_address_country"),
  createdBy: varchar("created_by", { length: 36 }).notNull(),
  updatedBy: varchar("updated_by", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, referenceId: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// Order Items table
export const orderItems = pgTable("order_items", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id", { length: 36 }).notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: varchar("product_id", { length: 36 }).notNull().references(() => products.id),
  requiredQuantity: integer("required_quantity").default(0),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

// Order Events table
export const orderEvents = pgTable("order_events", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id", { length: 36 }).notNull().references(() => orders.id, { onDelete: "cascade" }),
  status: orderStatusEnum("status").notNull(),
  requiredQuantity: integer("required_quantity").default(0),
  quantity: integer("quantity").default(0),
  comment: text("comment"),
  createdBy: varchar("created_by", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOrderEventSchema = createInsertSchema(orderEvents).omit({ id: true, createdAt: true });
export type InsertOrderEvent = z.infer<typeof insertOrderEventSchema>;
export type OrderEvent = typeof orderEvents.$inferSelect;

// BOLs (Bill of Lading) table
export const bols = pgTable("bols", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  referenceId: varchar("reference_id", { length: 50 }),
  carrierId: varchar("carrier_id", { length: 36 }).notNull().references(() => contacts.id),
  orderId: varchar("order_id", { length: 36 }).notNull().references(() => orders.id),
  orderType: orderTypeEnum("order_type").notNull(),
  pdfKey: text("pdf_key"),
  createdBy: varchar("created_by", { length: 36 }),
  updatedBy: varchar("updated_by", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBolSchema = createInsertSchema(bols).omit({ id: true, referenceId: true, createdAt: true, updatedAt: true });
export type InsertBol = z.infer<typeof insertBolSchema>;
export type Bol = typeof bols.$inferSelect;

// BOL Items table
export const bolItems = pgTable("bol_items", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  bolId: varchar("bol_id", { length: 36 }).notNull().references(() => bols.id, { onDelete: "cascade" }),
  productId: varchar("product_id", { length: 36 }).notNull().references(() => products.id),
  quantity: integer("quantity").default(0),
});

export const insertBolItemSchema = createInsertSchema(bolItems).omit({ id: true });
export type InsertBolItem = z.infer<typeof insertBolItemSchema>;
export type BolItem = typeof bolItems.$inferSelect;

// BOL Tags table (tags associated with a BOL)
export const bolTags = pgTable("bol_tags", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  bolId: varchar("bol_id", { length: 36 }).notNull().references(() => bols.id, { onDelete: "cascade" }),
  tagId: varchar("tag_id", { length: 255 }).notNull().references(() => tags.id),
});

export const insertBolTagSchema = createInsertSchema(bolTags).omit({ id: true });
export type InsertBolTag = z.infer<typeof insertBolTagSchema>;
export type BolTag = typeof bolTags.$inferSelect;

// Shipments table
export const shipments = pgTable("shipments", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  referenceId: varchar("reference_id", { length: 50 }),
  carrierId: varchar("carrier_id", { length: 36 }).notNull().references(() => contacts.id),
  orderType: orderTypeEnum("order_type").notNull(),
  shipmentDate: timestamp("shipment_date"),
  receivedDate: timestamp("received_date"),
  driverName: varchar("driver_name", { length: 255 }),
  driverDl: varchar("driver_dl", { length: 100 }),
  createdBy: varchar("created_by", { length: 36 }),
  updatedBy: varchar("updated_by", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertShipmentSchema = createInsertSchema(shipments).omit({ id: true, referenceId: true, createdAt: true, updatedAt: true });
export type InsertShipment = z.infer<typeof insertShipmentSchema>;
export type Shipment = typeof shipments.$inferSelect;

// Shipment BOLs junction table
export const shipmentBols = pgTable("shipment_bols", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  shipmentId: varchar("shipment_id", { length: 36 }).notNull().references(() => shipments.id, { onDelete: "cascade" }),
  bolId: varchar("bol_id", { length: 36 }).notNull().references(() => bols.id),
});

export const insertShipmentBolSchema = createInsertSchema(shipmentBols).omit({ id: true });
export type InsertShipmentBol = z.infer<typeof insertShipmentBolSchema>;
export type ShipmentBol = typeof shipmentBols.$inferSelect;

// Settings table
export const settings = pgTable("settings", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  binsPerPallet: integer("bins_per_pallet").default(48),
  palletWeight: real("pallet_weight").default(50),
  binWeight: real("bin_weight").default(5),
  warehouses: jsonb("warehouses").$type<Array<{name: string, address: {street: string, city: string, state: string, zipCode: string, country: string}}>>().default([]),
  emailSettings: jsonb("email_settings").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;

// Custom Fields table
export const customFields = pgTable("custom_fields", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  dataset: varchar("dataset", { length: 100 }).notNull(), // e.g., 'product', 'contact', 'tag'
  fieldName: varchar("field_name", { length: 100 }).notNull(),
  fieldType: varchar("field_type", { length: 50 }).notNull(), // text, number, date, boolean, select
  options: jsonb("options").$type<string[]>().default([]),
  required: boolean("required").default(false),
  createdBy: varchar("created_by", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCustomFieldSchema = createInsertSchema(customFields).omit({ id: true, createdAt: true });
export type InsertCustomField = z.infer<typeof insertCustomFieldSchema>;
export type CustomField = typeof customFields.$inferSelect;

// Hierarchies table (parent container)
export const hierarchies = pgTable("hierarchies", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  active: boolean("active").default(true),
  createdBy: varchar("created_by", { length: 36 }),
  updatedBy: varchar("updated_by", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertHierarchySchema = createInsertSchema(hierarchies).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertHierarchy = z.infer<typeof insertHierarchySchema>;
export type Hierarchy = typeof hierarchies.$inferSelect;

// Hierarchy Levels table
export const hierarchyLevels = pgTable("hierarchy_levels", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  level: integer("level").notNull().default(1),
  hierarchyId: varchar("hierarchy_id", { length: 36 }).references(() => hierarchies.id),
  active: boolean("active").default(true),
  createdBy: varchar("created_by", { length: 36 }),
  updatedBy: varchar("updated_by", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertHierarchyLevelSchema = createInsertSchema(hierarchyLevels).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertHierarchyLevel = z.infer<typeof insertHierarchyLevelSchema>;
export type HierarchyLevel = typeof hierarchyLevels.$inferSelect;

// Hierarchy Nodes table
export const hierarchyNodes = pgTable("hierarchy_nodes", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  hierarchyId: varchar("hierarchy_id", { length: 36 }).references(() => hierarchies.id),
  levelId: varchar("level_id", { length: 36 }).notNull().references(() => hierarchyLevels.id),
  parentId: varchar("parent_id", { length: 36 }),
  active: boolean("active").default(true),
  createdBy: varchar("created_by", { length: 36 }),
  updatedBy: varchar("updated_by", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertHierarchyNodeSchema = createInsertSchema(hierarchyNodes).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertHierarchyNode = z.infer<typeof insertHierarchyNodeSchema>;
export type HierarchyNode = typeof hierarchyNodes.$inferSelect;

// Asset Hierarchy Nodes junction table
export const assetHierarchyNodes = pgTable("asset_hierarchy_nodes", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id", { length: 36 }).notNull().references(() => assets.id, { onDelete: "cascade" }),
  hierarchyNodeId: varchar("hierarchy_node_id", { length: 36 }).notNull().references(() => hierarchyNodes.id),
});

export const insertAssetHierarchyNodeSchema = createInsertSchema(assetHierarchyNodes).omit({ id: true });
export type InsertAssetHierarchyNode = z.infer<typeof insertAssetHierarchyNodeSchema>;
export type AssetHierarchyNode = typeof assetHierarchyNodes.$inferSelect;

// Constants matching the original app
export const TAG_STATES = ["COMMISSIONED", "AVAILABLE", "DECOMMISSIONED"] as const;
export const ASSET_STATES = ["CLEANED", "ASSIGNED", "PROCESSING", "RETURNED", "DAMAGED", "FIXED", "DECOMMISSIONED"] as const;
export const ASSET_PROCESSES = ["COMMISSIONING", "SHIPPING", "RECEIVING", "PROCESSING", "INSPECTION"] as const;
export const ORDER_TYPES = ["OUTBOUND", "INBOUND"] as const;
export const ORDER_INBOUND_FLOW_STATES = ["INITIATED", "APPROVED", "SHIPPED", "RECEIVED"] as const;
export const ORDER_OUTBOUND_FLOW_STATES = ["INITIATED", "APPROVED", "SHIPPED-PARTIAL", "SHIPPED", "RETURNED", "RETURNED-PARTIAL"] as const;
export const ORDER_EXTRA_STATES = ["CANCELLED", "MANUAL RECONCILIATION"] as const;

// Role permissions available
export const ROLE_PERMISSIONS = [
  "admin",
  "UserManagement",
  "OrderManagement",
  "OrderCreateAll",
  "OrderCreateSelf",
  "OrderViewAll",
  "OrderViewSelf",
  "AssetManagement",
  "Analytics",
] as const;

// System reserved ID (for system operations)
export const SYSTEM_RESERVED_ID = "000000000000000000000000";
