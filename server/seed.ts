import { db } from "./db";
import { roles, contacts, products, settings, SYSTEM_RESERVED_ID } from "@shared/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Starting database seed...");

  // Create default roles
  const defaultRoles = [
    {
      id: "ADMIN",
      permissions: {
        admin: true,
        UserManagement: true,
        OrderManagement: true,
        OrderCreateAll: true,
        OrderViewAll: true,
        AssetManagement: true,
        Analytics: true,
      },
    },
    {
      id: "CUSTOMER",
      permissions: {
        OrderCreateSelf: true,
        OrderViewSelf: true,
      },
    },
    {
      id: "CARRIER",
      permissions: {},
    },
    {
      id: "PROCESSOR",
      permissions: {
        OrderCreateSelf: true,
        OrderViewSelf: true,
      },
    },
  ];

  for (const role of defaultRoles) {
    const existing = await db.select().from(roles).where(eq(roles.id, role.id));
    if (existing.length === 0) {
      await db.insert(roles).values(role as any);
      console.log(`Created role: ${role.id}`);
    } else {
      console.log(`Role already exists: ${role.id}`);
    }
  }

  // Create admin user
  const adminUsername = "admin";
  const adminPassword = "admin123";
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const existingAdmin = await db.select().from(contacts).where(eq(contacts.systemUserUsername, adminUsername));
  if (existingAdmin.length === 0) {
    await db.insert(contacts).values({
      type: "ADMIN",
      active: true,
      name: "System Administrator",
      phone: ["555-0000"],
      email: ["admin@cleantech.com"],
      notification: true,
      systemUserActive: true,
      systemUserUsername: adminUsername,
      systemUserPasswordHash: hashedPassword,
      systemUserPasswordLastChanged: new Date(),
    } as any);
    console.log(`Created admin user: ${adminUsername} / ${adminPassword}`);
  } else {
    console.log(`Admin user already exists: ${adminUsername}`);
  }

  // Create sample products
  const sampleProducts = [
    { name: "Standard Bin", description: "Standard 48-gallon recycling bin", weight: 5, active: true },
    { name: "Large Bin", description: "Large 96-gallon recycling bin", weight: 8, active: true },
    { name: "Industrial Container", description: "Industrial waste container", weight: 15, active: true },
  ];

  for (const product of sampleProducts) {
    const existing = await db.select().from(products).where(eq(products.name, product.name));
    if (existing.length === 0) {
      await db.insert(products).values(product as any);
      console.log(`Created product: ${product.name}`);
    } else {
      console.log(`Product already exists: ${product.name}`);
    }
  }

  // Create sample contacts
  const sampleContacts = [
    { type: "CUSTOMER", name: "Green Corp Industries", phone: ["555-1111"], email: ["contact@greencorp.com"], active: true },
    { type: "CARRIER", name: "Fast Freight Logistics", phone: ["555-2222"], email: ["dispatch@fastfreight.com"], active: true },
    { type: "PROCESSOR", name: "EcoProcess Center", phone: ["555-3333"], email: ["intake@ecoprocess.com"], active: true },
  ];

  for (const contact of sampleContacts) {
    const existing = await db.select().from(contacts).where(eq(contacts.name, contact.name));
    if (existing.length === 0) {
      await db.insert(contacts).values(contact as any);
      console.log(`Created contact: ${contact.name}`);
    } else {
      console.log(`Contact already exists: ${contact.name}`);
    }
  }

  // Create default settings
  const existingSettings = await db.select().from(settings);
  if (existingSettings.length === 0) {
    await db.insert(settings).values({
      binsPerPallet: 48,
      palletWeight: 50,
      binWeight: 5,
      warehouses: [
        {
          name: "Main Warehouse",
          address: {
            street: "123 Clean Street",
            city: "Green City",
            state: "EC",
            zipCode: "12345",
            country: "USA",
          },
        },
      ],
      emailSettings: {},
    } as any);
    console.log("Created default settings");
  } else {
    console.log("Settings already exist");
  }

  console.log("\nSeed completed!");
  console.log("\n=== Login Credentials ===");
  console.log(`Username: ${adminUsername}`);
  console.log(`Password: ${adminPassword}`);
  console.log("=========================\n");
}

seed().then(() => process.exit(0)).catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
