import * as BSON from 'bson';
import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { db } from '../db';
import { 
  roles, contacts, products, tags, assets, assetEvents,
  orders, orderItems, orderEvents, bols, bolItems, bolTags,
  shipments, shipmentBols, settings, customFields,
  hierarchies, hierarchyLevels, hierarchyNodes
} from '@shared/schema';
import { sql, eq, or } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

const SYSTEM_ID = '00000000-0000-0000-0000-000000000000';

const idMap: Map<string, string> = new Map();

function parseBsonFile(filePath: string): any[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  
  const data = fs.readFileSync(filePath);
  if (data.length === 0) return [];
  
  const documents: any[] = [];
  let offset = 0;
  
  while (offset < data.length) {
    try {
      const size = data.readInt32LE(offset);
      if (size <= 0 || size > 16 * 1024 * 1024) break;
      if (offset + size > data.length) break;
      const doc = BSON.deserialize(data.subarray(offset, offset + size));
      documents.push(doc);
      offset += size;
    } catch (e) {
      break;
    }
  }
  
  return documents;
}

function convertId(mongoId: string | null | undefined): string {
  if (!mongoId) return uuidv4();
  
  const mongoIdStr = mongoId.toString();
  
  if (mongoIdStr === '000000000000000000000000') {
    return SYSTEM_ID;
  }
  
  if (idMap.has(mongoIdStr)) {
    return idMap.get(mongoIdStr)!;
  }
  
  const newId = uuidv4();
  idMap.set(mongoIdStr, newId);
  return newId;
}

function getMappedId(mongoId: string | null | undefined): string | null {
  if (!mongoId) return null;
  
  const mongoIdStr = mongoId.toString();
  
  if (mongoIdStr === '000000000000000000000000') {
    return SYSTEM_ID;
  }
  
  return idMap.get(mongoIdStr) || null;
}

function parseDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === 'string') return new Date(dateValue);
  if (dateValue.$date) return new Date(dateValue.$date);
  return null;
}

async function clearDatabase() {
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
}

async function importRoles(exportDir: string) {
  const docs = parseBsonFile(path.join(exportDir, 'roles.bson'));
  
  for (const doc of docs) {
    const roleId = doc._id.toString();
    idMap.set(roleId, roleId);
    
    await db.insert(roles).values({
      id: roleId,
      name: doc.name || roleId,
      permissions: doc.permissions || {},
      createdBy: doc.createdBy ? getMappedId(doc.createdBy) : null,
      createdAt: parseDate(doc.createdAt),
      updatedAt: parseDate(doc.updatedAt),
    }).onConflictDoNothing();
  }
  
  return docs.length;
}

async function importContacts(exportDir: string) {
  const docs = parseBsonFile(path.join(exportDir, 'contacts.bson'));
  
  for (const doc of docs) {
    const id = convertId(doc._id);
    const contactType = doc.type || 'CUSTOMER';
    const address = doc.address || {};
    
    await db.insert(contacts).values({
      id,
      type: contactType,
      active: doc.active ?? true,
      name: doc.name || 'Unknown',
      phone: Array.isArray(doc.phone) ? doc.phone : (doc.phone ? [doc.phone] : []),
      email: Array.isArray(doc.email) ? doc.email : (doc.email ? [doc.email] : []),
      addressStreet: address.street || null,
      addressCity: address.city || null,
      addressState: address.state || null,
      addressZipCode: address.zipCode || null,
      addressCountry: address.country || null,
      systemUserActive: doc.systemUser?.active ?? null,
      systemUserUsername: doc.systemUser?.username || null,
      systemUserPasswordHash: doc.systemUser?.password?.hash || null,
      systemUserPasswordLastChanged: parseDate(doc.systemUser?.password?.lastChanged),
      createdBy: getMappedId(doc.createdBy),
      createdAt: parseDate(doc.createdAt),
      updatedAt: parseDate(doc.updatedAt),
    }).onConflictDoNothing();
  }
  
  return docs.length;
}

async function importProducts(exportDir: string) {
  const docs = parseBsonFile(path.join(exportDir, 'products.bson'));
  
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
  
  return docs.length;
}

async function importTags(exportDir: string) {
  const docs = parseBsonFile(path.join(exportDir, 'tags.bson'));
  
  const batchSize = 500;
  let imported = 0;
  
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    const values = batch.map(doc => {
      const id = doc._id.toString();
      idMap.set(id, id);
      
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
  }
  
  return imported;
}

async function importAssets(exportDir: string) {
  const docs = parseBsonFile(path.join(exportDir, 'assets.bson'));
  
  const batchSize = 500;
  let imported = 0;
  
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    
    const values = batch
      .filter(doc => {
        const productId = getMappedId(doc.product);
        const tagId = doc.tag?.toString();
        return productId && tagId;
      })
      .map(doc => {
        const id = convertId(doc._id);
        const tagId = doc.tag.toString();
        
        return {
          id,
          productId: getMappedId(doc.product)!,
          tagId,
          active: doc.active ?? true,
          lastState: doc.lastState || 'AVAILABLE',
          customerId: getMappedId(doc.customer),
          createdBy: getMappedId(doc.createdBy),
          createdAt: parseDate(doc.createdAt),
          updatedAt: parseDate(doc.updatedAt),
        };
      });
    
    if (values.length > 0) {
      await db.insert(assets).values(values).onConflictDoNothing();
    }
    imported += values.length;
  }
  
  return imported;
}

async function importOrders(exportDir: string) {
  const docs = parseBsonFile(path.join(exportDir, 'orders.bson'));
  let imported = 0;
  
  for (const doc of docs) {
    const id = convertId(doc._id);
    const customerId = getMappedId(doc.customer);
    const createdBy = getMappedId(doc.createdBy) || SYSTEM_ID;
    
    if (!customerId) continue;
    
    const receiverAddress = doc.receiverAddress?.address;
    
    await db.insert(orders).values({
      id,
      referenceId: doc.referenceId || `ORD-${Date.now()}`,
      type: doc.type || 'OUTBOUND',
      customerId,
      status: doc.status || 'INITIATED',
      carrierId: getMappedId(doc.carrier),
      poNumber: doc.poNumber || '',
      palletCount: doc.palletCount || 0,
      palletWeight: doc.palletWeight || 0,
      binWeight: doc.binWeight || 0,
      orderWeight: doc.orderWeight || 0,
      requiredDate: parseDate(doc.requiredDate),
      shipDate: parseDate(doc.shipDate),
      receiverName: doc.receiverAddress?.name || null,
      receiverAddressStreet: receiverAddress?.street || null,
      receiverAddressCity: receiverAddress?.city || null,
      receiverAddressState: receiverAddress?.state || null,
      receiverAddressZipCode: receiverAddress?.zipCode || null,
      receiverAddressCountry: receiverAddress?.country || null,
      createdBy,
      updatedBy: getMappedId(doc.updatedBy),
      createdAt: parseDate(doc.createdAt),
      updatedAt: parseDate(doc.updatedAt),
    }).onConflictDoNothing();
    
    if (doc.items && Array.isArray(doc.items)) {
      for (const item of doc.items) {
        const productId = getMappedId(item.product);
        if (!productId) continue;
        
        await db.insert(orderItems).values({
          id: convertId(item._id),
          orderId: id,
          productId,
          requiredQuantity: item.requiredQuantity || 0,
        }).onConflictDoNothing();
      }
    }
    imported++;
  }
  
  return imported;
}

async function importOrderEvents(exportDir: string) {
  const docs = parseBsonFile(path.join(exportDir, 'orderevents.bson'));
  let imported = 0;
  
  for (const doc of docs) {
    const id = convertId(doc._id);
    const orderId = getMappedId(doc.order);
    
    if (!orderId) continue;
    
    await db.insert(orderEvents).values({
      id,
      orderId,
      status: doc.status || 'INITIATED',
      comment: doc.comment || null,
      createdBy: getMappedId(doc.createdBy),
      createdAt: parseDate(doc.createdAt),
    }).onConflictDoNothing();
    imported++;
  }
  
  return imported;
}

async function importAssetEvents(exportDir: string) {
  const docs = parseBsonFile(path.join(exportDir, 'assetevents.bson'));
  
  const batchSize = 500;
  let imported = 0;
  
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    const values = batch
      .filter(doc => getMappedId(doc.asset) !== null)
      .map(doc => {
        const id = convertId(doc._id);
        
        return {
          id,
          assetId: getMappedId(doc.asset)!,
          state: doc.state || 'ASSIGNED',
          process: doc.process || 'SHIPPING',
          comment: doc.comment || null,
          outboundOrderId: getMappedId(doc.outboundOrder) || getMappedId(doc.inboundOrder),
          shipmentId: getMappedId(doc.shipment),
          createdBy: getMappedId(doc.createdBy),
          createdAt: parseDate(doc.createdAt),
        };
      });
    
    if (values.length > 0) {
      await db.insert(assetEvents).values(values).onConflictDoNothing();
    }
    imported += values.length;
  }
  
  return imported;
}

async function importBols(exportDir: string) {
  const docs = parseBsonFile(path.join(exportDir, 'bols.bson'));
  let imported = 0;
  
  for (const doc of docs) {
    const id = convertId(doc._id);
    const carrierId = getMappedId(doc.carrier);
    const orderId = getMappedId(doc.order);
    
    if (!carrierId || !orderId) continue;
    
    await db.insert(bols).values({
      id,
      referenceId: doc.referenceId || `BOL-${Date.now()}`,
      carrierId,
      orderId,
      orderType: doc.orderType || 'OUTBOUND',
      createdBy: getMappedId(doc.createdBy),
      createdAt: parseDate(doc.createdAt),
      updatedAt: parseDate(doc.updatedAt),
    }).onConflictDoNothing();
    
    if (doc.items && Array.isArray(doc.items)) {
      for (const item of doc.items) {
        const productId = getMappedId(item.product);
        if (!productId) continue;
        
        await db.insert(bolItems).values({
          id: convertId(item._id),
          bolId: id,
          productId,
          quantity: item.quantity || 0,
        }).onConflictDoNothing();
      }
    }
    
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
    imported++;
  }
  
  return imported;
}

async function importShipments(exportDir: string) {
  const docs = parseBsonFile(path.join(exportDir, 'shipments.bson'));
  let imported = 0;
  
  for (const doc of docs) {
    const id = convertId(doc._id);
    const carrierId = getMappedId(doc.carrier);
    
    if (!carrierId) continue;
    
    await db.insert(shipments).values({
      id,
      referenceId: doc.referenceId || `SHIP-${Date.now()}`,
      carrierId,
      orderType: doc.orderType || 'OUTBOUND',
      shipmentDate: parseDate(doc.shipmentDate),
      driverName: doc.driver?.name || null,
      driverDl: doc.driver?.dl || null,
      createdBy: getMappedId(doc.createdBy),
      createdAt: parseDate(doc.createdAt),
      updatedAt: parseDate(doc.updatedAt),
    }).onConflictDoNothing();
    
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
    imported++;
  }
  
  return imported;
}

async function importSettings(exportDir: string) {
  const docs = parseBsonFile(path.join(exportDir, 'settings.bson'));
  
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
  
  return docs.length;
}

async function importCustomFields(exportDir: string) {
  const docs = parseBsonFile(path.join(exportDir, 'customfields.bson'));
  
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
  
  return docs.length;
}

async function importHierarchies(exportDir: string) {
  const hierarchyDocs = parseBsonFile(path.join(exportDir, 'hierarchies.bson'));
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
  
  const levelDocs = parseBsonFile(path.join(exportDir, 'hierarchylevels.bson'));
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
  
  const nodeDocs = parseBsonFile(path.join(exportDir, 'hierarchynodes.bson'));
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
  
  return { hierarchies: hierarchyDocs.length, levels: levelDocs.length, nodes: nodeDocs.length };
}

async function setupAdminPasswords() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  await db.update(contacts)
    .set({ systemUserPasswordHash: hashedPassword })
    .where(
      or(
        eq(contacts.type, 'ADMIN'),
        eq(contacts.type, 'OWNER')
      )
    );
}

export interface ImportResult {
  success: boolean;
  message: string;
  stats?: {
    roles: number;
    contacts: number;
    products: number;
    tags: number;
    assets: number;
    orders: number;
    orderEvents: number;
    assetEvents: number;
    bols: number;
    shipments: number;
    settings: number;
    customFields: number;
    hierarchies: number;
    hierarchyLevels: number;
    hierarchyNodes: number;
  };
}

export async function importFromZip(zipBuffer: Buffer): Promise<ImportResult> {
  const tempDir = path.join('/tmp', `import-${Date.now()}`);
  
  try {
    const zip = new AdmZip(zipBuffer);
    zip.extractAllTo(tempDir, true);
    
    let exportDir = tempDir;
    const entries = fs.readdirSync(tempDir);
    
    if (entries.includes('myworkapp')) {
      exportDir = path.join(tempDir, 'myworkapp');
    } else if (entries.length === 1) {
      const subDir = path.join(tempDir, entries[0]);
      if (fs.statSync(subDir).isDirectory()) {
        const subEntries = fs.readdirSync(subDir);
        if (subEntries.includes('myworkapp')) {
          exportDir = path.join(subDir, 'myworkapp');
        } else if (subEntries.some(e => e.endsWith('.bson'))) {
          exportDir = subDir;
        }
      }
    }
    
    const bsonFiles = fs.readdirSync(exportDir).filter(f => f.endsWith('.bson'));
    if (bsonFiles.length === 0) {
      return { success: false, message: 'No BSON files found in the zip archive' };
    }
    
    idMap.clear();
    
    await clearDatabase();
    
    const stats = {
      roles: await importRoles(exportDir),
      contacts: await importContacts(exportDir),
      products: await importProducts(exportDir),
      tags: await importTags(exportDir),
      assets: await importAssets(exportDir),
      orders: await importOrders(exportDir),
      orderEvents: await importOrderEvents(exportDir),
      assetEvents: await importAssetEvents(exportDir),
      bols: await importBols(exportDir),
      shipments: await importShipments(exportDir),
      settings: await importSettings(exportDir),
      customFields: await importCustomFields(exportDir),
      hierarchies: 0,
      hierarchyLevels: 0,
      hierarchyNodes: 0,
    };
    
    const hierarchyStats = await importHierarchies(exportDir);
    stats.hierarchies = hierarchyStats.hierarchies;
    stats.hierarchyLevels = hierarchyStats.levels;
    stats.hierarchyNodes = hierarchyStats.nodes;
    
    await setupAdminPasswords();
    
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    return {
      success: true,
      message: 'Data import completed successfully',
      stats,
    };
  } catch (error: any) {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
    
    return {
      success: false,
      message: `Import failed: ${error.message}`,
    };
  }
}
