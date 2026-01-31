/**
 * MongoDB to PostgreSQL Import Script
 * 
 * Usage: npx tsx server/import-mongodb.ts
 * 
 * This script imports data from MongoDB BSON export files into the PostgreSQL database.
 * It handles:
 * - BSON parsing
 * - MongoDB ObjectId to UUID conversion
 * - Field name mapping
 * - Proper insertion order (respecting foreign keys)
 * - Data transformation and normalization
 */

import * as BSON from 'bson';
import * as fs from 'fs';
import * as path from 'path';
import { db } from './db';
import { 
  roles, contacts, products, tags, assets, assetEvents,
  orders, orderItems, orderEvents, bols, bolItems, bolTags,
  shipments, shipmentBols, settings, customFields,
  hierarchies, hierarchyLevels, hierarchyNodes
} from '@shared/schema';
import { sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const EXPORT_DIR = './mongodb_export/myworkapp';

// Map to track MongoDB ObjectId to PostgreSQL UUID conversions
const idMap: Map<string, string> = new Map();

// Special system IDs that should be preserved
const SYSTEM_ID = '00000000-0000-0000-0000-000000000000';

function parseBsonFile(filePath: string): any[] {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return [];
  }
  
  const data = fs.readFileSync(filePath);
  if (data.length === 0) return [];
  
  const documents: any[] = [];
  let offset = 0;
  
  while (offset < data.length) {
    const size = data.readInt32LE(offset);
    if (size <= 0 || offset + size > data.length) break;
    const doc = BSON.deserialize(data.subarray(offset, offset + size));
    documents.push(doc);
    offset += size;
  }
  
  return documents;
}

// Convert MongoDB ObjectId string to UUID
function convertId(mongoId: string | null | undefined): string {
  if (!mongoId) return uuidv4();
  
  const mongoIdStr = mongoId.toString();
  
  // Handle system ID
  if (mongoIdStr === '000000000000000000000000') {
    return SYSTEM_ID;
  }
  
  // Check if already mapped
  if (idMap.has(mongoIdStr)) {
    return idMap.get(mongoIdStr)!;
  }
  
  // Generate new UUID and store mapping
  const newId = uuidv4();
  idMap.set(mongoIdStr, newId);
  return newId;
}

// Get mapped ID (for foreign key references)
function getMappedId(mongoId: string | null | undefined): string | null {
  if (!mongoId) return null;
  
  const mongoIdStr = mongoId.toString();
  
  if (mongoIdStr === '000000000000000000000000') {
    return SYSTEM_ID;
  }
  
  return idMap.get(mongoIdStr) || null;
}

// Parse MongoDB date
function parseDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === 'string') return new Date(dateValue);
  if (dateValue.$date) return new Date(dateValue.$date);
  return null;
}

async function clearDatabase() {
  console.log('Clearing existing data...');
  
  // Delete in reverse order of dependencies
  await db.delete(assetEvents);
  await db.delete(bolTags);
  await db.delete(bolItems);
  await db.delete(shipmentBols);
  await db.delete(shipments);
  await db.delete(bols);
  await db.delete(orderEvents);
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(assets);
  await db.delete(tags);
  await db.delete(products);
  await db.delete(customFields);
  await db.delete(hierarchyNodes);
  await db.delete(hierarchyLevels);
  await db.delete(hierarchies);
  await db.delete(contacts);
  await db.delete(roles);
  await db.delete(settings);
  
  console.log('Database cleared.');
}

async function importRoles() {
  console.log('Importing roles...');
  const docs = parseBsonFile(path.join(EXPORT_DIR, 'roles.bson'));
  
  for (const doc of docs) {
    const id = convertId(doc._id);
    
    await db.insert(roles).values({
      id,
      name: doc.name || 'Unknown',
      permissions: doc.permissions || {},
      createdBy: getMappedId(doc.createdBy),
      createdAt: parseDate(doc.createdAt),
      updatedAt: parseDate(doc.updatedAt),
    }).onConflictDoNothing();
  }
  
  console.log(`Imported ${docs.length} roles`);
}

async function importContacts() {
  console.log('Importing contacts...');
  const docs = parseBsonFile(path.join(EXPORT_DIR, 'contacts.bson'));
  
  for (const doc of docs) {
    const id = convertId(doc._id);
    
    // Extract system user data
    let systemUser = null;
    if (doc.systemUser && doc.systemUser.username) {
      systemUser = {
        active: doc.systemUser.active ?? true,
        username: doc.systemUser.username,
        password: doc.systemUser.password?.hash || null,
        lastPasswordChange: parseDate(doc.systemUser.password?.lastChanged)?.toISOString() || null,
        role: getMappedId(doc.systemUser.role) || null,
      };
    }
    
    await db.insert(contacts).values({
      id,
      type: doc.type || 'CUSTOMER',
      active: doc.active ?? true,
      systemUser,
      name: doc.name || 'Unknown',
      address: doc.address || null,
      phone: Array.isArray(doc.phone) ? doc.phone : (doc.phone ? [doc.phone] : []),
      email: Array.isArray(doc.email) ? doc.email : (doc.email ? [doc.email] : []),
      createdBy: getMappedId(doc.createdBy),
      createdAt: parseDate(doc.createdAt),
      updatedAt: parseDate(doc.updatedAt),
    }).onConflictDoNothing();
  }
  
  console.log(`Imported ${docs.length} contacts`);
}

async function importProducts() {
  console.log('Importing products...');
  const docs = parseBsonFile(path.join(EXPORT_DIR, 'products.bson'));
  
  for (const doc of docs) {
    const id = convertId(doc._id);
    
    await db.insert(products).values({
      id,
      name: doc.name || 'Unknown Product',
      description: doc.description || null,
      sku: doc.sku || null,
      active: doc.active ?? true,
      customAttributes: doc.customAttributes || {},
      createdBy: getMappedId(doc.createdBy),
      createdAt: parseDate(doc.createdAt),
      updatedAt: parseDate(doc.updatedAt),
    }).onConflictDoNothing();
  }
  
  console.log(`Imported ${docs.length} products`);
}

async function importTags() {
  console.log('Importing tags...');
  const docs = parseBsonFile(path.join(EXPORT_DIR, 'tags.bson'));
  
  // Process in batches for performance
  const batchSize = 500;
  let imported = 0;
  
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    const values = batch.map(doc => {
      // For tags, we preserve the original MongoDB _id as the ID since it's used as EPC
      const id = doc._id.toString();
      idMap.set(id, id); // Store in map for reference
      
      return {
        id,
        upc: doc.upc || null,
        type: doc.type || 'unknown',
        state: doc.state || 'AVAILABLE',
        customAttributes: doc.customAttributes || {},
        createdBy: getMappedId(doc.createdBy),
        createdAt: parseDate(doc.createdAt),
        updatedAt: parseDate(doc.updatedAt),
      };
    });
    
    await db.insert(tags).values(values).onConflictDoNothing();
    imported += batch.length;
    
    if (imported % 5000 === 0) {
      console.log(`  Imported ${imported}/${docs.length} tags...`);
    }
  }
  
  console.log(`Imported ${docs.length} tags`);
}

async function importAssets() {
  console.log('Importing assets...');
  const docs = parseBsonFile(path.join(EXPORT_DIR, 'assets.bson'));
  
  // Process in batches for performance
  const batchSize = 500;
  let imported = 0;
  
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    const values = batch.map(doc => {
      const id = convertId(doc._id);
      
      // Tag ID - preserve the original tag reference
      const tagId = doc.tag?.toString() || null;
      
      return {
        id,
        productId: getMappedId(doc.product),
        tagId,
        active: doc.active ?? true,
        lastState: doc.lastState || 'AVAILABLE',
        customerId: getMappedId(doc.customer),
        createdBy: getMappedId(doc.createdBy),
        createdAt: parseDate(doc.createdAt),
        updatedAt: parseDate(doc.updatedAt),
      };
    });
    
    await db.insert(assets).values(values).onConflictDoNothing();
    imported += batch.length;
    
    if (imported % 5000 === 0) {
      console.log(`  Imported ${imported}/${docs.length} assets...`);
    }
  }
  
  console.log(`Imported ${docs.length} assets`);
}

async function importOrders() {
  console.log('Importing orders...');
  const docs = parseBsonFile(path.join(EXPORT_DIR, 'orders.bson'));
  
  for (const doc of docs) {
    const id = convertId(doc._id);
    
    await db.insert(orders).values({
      id,
      referenceId: doc.referenceId || `ORD-${Date.now()}`,
      orderType: doc.orderType || 'OUTBOUND',
      customerId: getMappedId(doc.customer),
      status: doc.status || 'INITIATED',
      notes: doc.notes || null,
      createdBy: getMappedId(doc.createdBy),
      createdAt: parseDate(doc.createdAt),
      updatedAt: parseDate(doc.updatedAt),
    }).onConflictDoNothing();
    
    // Import order items
    if (doc.items && Array.isArray(doc.items)) {
      for (const item of doc.items) {
        await db.insert(orderItems).values({
          id: convertId(item._id),
          orderId: id,
          productId: getMappedId(item.product),
          quantity: item.quantity || 0,
          createdAt: parseDate(doc.createdAt),
        }).onConflictDoNothing();
      }
    }
  }
  
  console.log(`Imported ${docs.length} orders`);
}

async function importOrderEvents() {
  console.log('Importing order events...');
  const docs = parseBsonFile(path.join(EXPORT_DIR, 'orderevents.bson'));
  
  for (const doc of docs) {
    const id = convertId(doc._id);
    
    await db.insert(orderEvents).values({
      id,
      orderId: getMappedId(doc.order),
      status: doc.status || 'INITIATED',
      comment: doc.comment || null,
      createdBy: getMappedId(doc.createdBy),
      createdAt: parseDate(doc.createdAt),
    }).onConflictDoNothing();
  }
  
  console.log(`Imported ${docs.length} order events`);
}

async function importAssetEvents() {
  console.log('Importing asset events...');
  const docs = parseBsonFile(path.join(EXPORT_DIR, 'assetevents.bson'));
  
  // Process in batches for performance
  const batchSize = 500;
  let imported = 0;
  
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    const values = batch.map(doc => {
      const id = convertId(doc._id);
      
      return {
        id,
        assetId: getMappedId(doc.asset),
        state: doc.state || 'AVAILABLE',
        process: doc.process || null,
        comment: doc.comment || null,
        orderId: getMappedId(doc.outboundOrder) || getMappedId(doc.inboundOrder),
        shipmentId: getMappedId(doc.shipment),
        createdBy: getMappedId(doc.createdBy),
        createdAt: parseDate(doc.createdAt),
      };
    });
    
    await db.insert(assetEvents).values(values).onConflictDoNothing();
    imported += batch.length;
    
    if (imported % 1000 === 0) {
      console.log(`  Imported ${imported}/${docs.length} asset events...`);
    }
  }
  
  console.log(`Imported ${docs.length} asset events`);
}

async function importBols() {
  console.log('Importing BOLs...');
  const docs = parseBsonFile(path.join(EXPORT_DIR, 'bols.bson'));
  
  for (const doc of docs) {
    const id = convertId(doc._id);
    
    await db.insert(bols).values({
      id,
      referenceId: doc.referenceId || `BOL-${Date.now()}`,
      carrierId: getMappedId(doc.carrier),
      orderId: getMappedId(doc.order),
      orderType: doc.orderType || 'OUTBOUND',
      createdBy: getMappedId(doc.createdBy),
      createdAt: parseDate(doc.createdAt),
      updatedAt: parseDate(doc.updatedAt),
    }).onConflictDoNothing();
    
    // Import BOL items
    if (doc.items && Array.isArray(doc.items)) {
      for (const item of doc.items) {
        await db.insert(bolItems).values({
          id: convertId(item._id),
          bolId: id,
          productId: getMappedId(item.product),
          quantity: item.quantity || 0,
        }).onConflictDoNothing();
      }
    }
    
    // Import BOL tags
    if (doc.tags && Array.isArray(doc.tags)) {
      for (const tagId of doc.tags) {
        const tagIdStr = tagId.toString();
        await db.insert(bolTags).values({
          id: uuidv4(),
          bolId: id,
          tagId: tagIdStr,
        }).onConflictDoNothing();
      }
    }
  }
  
  console.log(`Imported ${docs.length} BOLs`);
}

async function importShipments() {
  console.log('Importing shipments...');
  const docs = parseBsonFile(path.join(EXPORT_DIR, 'shipments.bson'));
  
  for (const doc of docs) {
    const id = convertId(doc._id);
    
    await db.insert(shipments).values({
      id,
      referenceId: doc.referenceId || `SHIP-${Date.now()}`,
      carrierId: getMappedId(doc.carrier),
      orderType: doc.orderType || 'OUTBOUND',
      shipmentDate: parseDate(doc.shipmentDate),
      driver: doc.driver || null,
      createdBy: getMappedId(doc.createdBy),
      createdAt: parseDate(doc.createdAt),
      updatedAt: parseDate(doc.updatedAt),
    }).onConflictDoNothing();
    
    // Import shipment BOL references
    if (doc.bols && Array.isArray(doc.bols)) {
      for (const bolId of doc.bols) {
        const mappedBolId = getMappedId(bolId);
        if (mappedBolId) {
          await db.insert(shipmentBols).values({
            id: uuidv4(),
            shipmentId: id,
            bolId: mappedBolId,
          }).onConflictDoNothing();
        }
      }
    }
  }
  
  console.log(`Imported ${docs.length} shipments`);
}

async function importSettings() {
  console.log('Importing settings...');
  const docs = parseBsonFile(path.join(EXPORT_DIR, 'settings.bson'));
  
  for (const doc of docs) {
    const id = convertId(doc._id);
    
    await db.insert(settings).values({
      id,
      palletWeight: doc.palletWeight || null,
      binWeight: doc.binWeight || null,
      binsPerPallet: doc.binsPerPallet || null,
      warehouses: doc.warehouses || [],
      emailSettings: doc.emailSettings || null,
      createdBy: getMappedId(doc.createdBy),
      createdAt: parseDate(doc.createdAt),
      updatedAt: parseDate(doc.updatedAt),
    }).onConflictDoNothing();
  }
  
  console.log(`Imported ${docs.length} settings`);
}

async function importCustomFields() {
  console.log('Importing custom fields...');
  const docs = parseBsonFile(path.join(EXPORT_DIR, 'customfields.bson'));
  
  for (const doc of docs) {
    const id = convertId(doc._id);
    
    await db.insert(customFields).values({
      id,
      dataset: doc.dataset || 'unknown',
      fieldName: doc.fieldName || 'field',
      fieldType: doc.fieldType || 'text',
      options: doc.options || [],
      required: doc.required ?? false,
      createdBy: getMappedId(doc.createdBy),
      createdAt: parseDate(doc.createdAt),
      updatedAt: parseDate(doc.updatedAt),
    }).onConflictDoNothing();
  }
  
  console.log(`Imported ${docs.length} custom fields`);
}

async function importHierarchies() {
  console.log('Importing hierarchies...');
  
  // Import hierarchies
  const hierarchyDocs = parseBsonFile(path.join(EXPORT_DIR, 'hierarchies.bson'));
  for (const doc of hierarchyDocs) {
    const id = convertId(doc._id);
    
    await db.insert(hierarchies).values({
      id,
      name: doc.name || 'Unknown',
      description: doc.description || null,
      active: doc.active ?? true,
      createdBy: getMappedId(doc.createdBy),
      createdAt: parseDate(doc.createdAt),
      updatedAt: parseDate(doc.updatedAt),
    }).onConflictDoNothing();
  }
  console.log(`Imported ${hierarchyDocs.length} hierarchies`);
  
  // Import hierarchy levels
  const levelDocs = parseBsonFile(path.join(EXPORT_DIR, 'hierarchylevels.bson'));
  for (const doc of levelDocs) {
    const id = convertId(doc._id);
    
    await db.insert(hierarchyLevels).values({
      id,
      hierarchyId: getMappedId(doc.hierarchy),
      name: doc.name || 'Level',
      description: doc.description || null,
      order: doc.order || 0,
      active: doc.active ?? true,
      createdBy: getMappedId(doc.createdBy),
      createdAt: parseDate(doc.createdAt),
      updatedAt: parseDate(doc.updatedAt),
    }).onConflictDoNothing();
  }
  console.log(`Imported ${levelDocs.length} hierarchy levels`);
  
  // Import hierarchy nodes
  const nodeDocs = parseBsonFile(path.join(EXPORT_DIR, 'hierarchynodes.bson'));
  for (const doc of nodeDocs) {
    const id = convertId(doc._id);
    
    await db.insert(hierarchyNodes).values({
      id,
      hierarchyId: getMappedId(doc.hierarchy),
      levelId: getMappedId(doc.level),
      parentId: getMappedId(doc.parent),
      name: doc.name || 'Node',
      description: doc.description || null,
      active: doc.active ?? true,
      createdBy: getMappedId(doc.createdBy),
      createdAt: parseDate(doc.createdAt),
      updatedAt: parseDate(doc.updatedAt),
    }).onConflictDoNothing();
  }
  console.log(`Imported ${nodeDocs.length} hierarchy nodes`);
}

async function main() {
  console.log('========================================');
  console.log('MongoDB to PostgreSQL Import Script');
  console.log('========================================\n');
  
  const startTime = Date.now();
  
  try {
    // Clear existing data
    await clearDatabase();
    
    // Import in order of dependencies
    await importRoles();
    await importContacts();
    await importSettings();
    await importCustomFields();
    await importProducts();
    await importTags();
    await importAssets();
    await importHierarchies();
    await importOrders();
    await importOrderEvents();
    await importBols();
    await importShipments();
    await importAssetEvents();
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n========================================');
    console.log(`Import completed in ${elapsed} seconds`);
    console.log('========================================');
    
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
