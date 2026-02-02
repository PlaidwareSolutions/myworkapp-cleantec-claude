import PDFDocument from "pdfkit";
import type { PDFDocument as PDFDocumentType } from "pdfkit";
import {
  Order,
  OrderItem,
  Contact,
  Bol,
  BolItem,
  Settings,
  Shipment,
} from "@shared/schema";
import { storage } from "../storage";
import path from "path";
import fs from "fs";

const COMPANY_NAME = "CleanTech Asset Tracking";
const COMPANY_ADDRESS = "123 Clean Street, Green City, EC 12345";

const CLEANTEC_LOGO_PATH = path.join(
  process.cwd(),
  "server/assets/cleantec-logo.png",
);
const MYWORKAPP_LOGO_PATH = path.join(
  process.cwd(),
  "server/assets/myworkapp-icon.png",
);

function formatDate(date: Date | null | undefined): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function addHeader(doc: InstanceType<typeof PDFDocument>) {
  const startY = 30;

  if (fs.existsSync(CLEANTEC_LOGO_PATH)) {
    doc.image(CLEANTEC_LOGO_PATH, 220, startY, { width: 150 });
    doc.y = startY + 60;
  } else {
    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .text(COMPANY_NAME, 50, startY, { align: "center" });
  }

  doc
    .fontSize(10)
    .font("Helvetica")
    .text(COMPANY_ADDRESS, 50, doc.y, { align: "center" });
  doc.moveDown();
}

function addFooter(doc: InstanceType<typeof PDFDocument>) {
  // Fixed footer position at bottom of page (A4: 842 points height)
  const footerY = 770;

  // Left side: Powered by MyWorkApp.io with optional logo
  if (fs.existsSync(MYWORKAPP_LOGO_PATH)) {
    doc.image(MYWORKAPP_LOGO_PATH, 50, footerY - 5, { width: 20 });
    doc.fontSize(8).font("Helvetica");
    doc.text("Powered by MyWorkApp.io", 75, footerY, {
      lineBreak: false,
      continued: false,
    });
  } else {
    doc.fontSize(8).font("Helvetica");
    doc.text("Powered by MyWorkApp.io", 50, footerY, {
      lineBreak: false,
      continued: false,
    });
  }

  // Right side: Printed on date
  doc.fontSize(8);
  doc.text(`Printed on ${new Date().toLocaleString()}`, 300, footerY, {
    align: "right",
    width: 245,
    lineBreak: false,
    continued: false,
  });
}

export async function generateOrderPdf(
  order: Order,
  items: OrderItem[],
  customer: Contact,
  carrier: Contact | null,
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      addHeader(doc);

      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("ORDER CONFIRMATION", { align: "center" });
      doc.moveDown(1.5);

      doc.fontSize(12).font("Helvetica-Bold").text("Order Information");
      doc.moveDown(0.3);
      doc.fontSize(10).font("Helvetica");

      const orderBoxY = doc.y;
      doc.rect(50, orderBoxY, 495, 85).stroke();

      doc.text(
        `Order Reference: ${order.referenceId || "N/A"}`,
        60,
        orderBoxY + 10,
      );
      doc.text(`PO Number: ${order.poNumber || "N/A"}`, 60, orderBoxY + 25);
      doc.text(`Order Type: ${order.type}`, 60, orderBoxY + 40);
      doc.text(`Status: ${order.status}`, 60, orderBoxY + 55);

      doc.text(
        `Required Date: ${formatDate(order.requiredDate)}`,
        300,
        orderBoxY + 10,
      );
      doc.text(`Ship Date: ${formatDate(order.shipDate)}`, 300, orderBoxY + 25);
      doc.text(`Created: ${formatDate(order.createdAt)}`, 300, orderBoxY + 40);

      doc.y = orderBoxY + 95;
      doc.moveDown();

      const infoSectionY = doc.y;

      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Customer Information", 50, infoSectionY);
      doc.moveDown(0.3);
      const customerBoxY = doc.y;
      doc.fontSize(10).font("Helvetica");

      // Calculate dynamic heights based on content
      const customerEmail = customer.email?.join(", ") || "N/A";
      const customerPhone = customer.phone?.join(", ") || "N/A";
      const carrierEmail = carrier?.email?.join(", ") || "N/A";
      const carrierPhone = carrier?.phone?.join(", ") || "N/A";

      // Measure text heights
      const customerEmailHeight = doc.heightOfString(
        `Email: ${customerEmail}`,
        { width: 210 },
      );
      const customerPhoneHeight = doc.heightOfString(
        `Phone: ${customerPhone}`,
        { width: 210 },
      );
      const carrierEmailHeight = doc.heightOfString(`Email: ${carrierEmail}`, {
        width: 215,
      });
      const carrierPhoneHeight = doc.heightOfString(`Phone: ${carrierPhone}`, {
        width: 215,
      });

      // Calculate box height: name(15) + padding(10) + email + phone + padding(10)
      const customerBoxHeight =
        10 + 15 + customerEmailHeight + customerPhoneHeight + 10;
      const carrierBoxHeight =
        10 + 15 + carrierEmailHeight + carrierPhoneHeight + 10;
      const maxBoxHeight = Math.max(customerBoxHeight, carrierBoxHeight, 65);

      doc.rect(50, customerBoxY, 230, maxBoxHeight).stroke();
      doc.text(`Name: ${customer.name}`, 60, customerBoxY + 10, {
        width: 210,
        ellipsis: true,
      });
      doc.text(`Email: ${customerEmail}`, 60, customerBoxY + 25, {
        width: 210,
      });
      const customerPhoneY = customerBoxY + 25 + customerEmailHeight;
      doc.text(`Phone: ${customerPhone}`, 60, customerPhoneY, {
        width: 210,
        ellipsis: true,
      });

      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Carrier Information", 310, infoSectionY);
      doc.fontSize(10).font("Helvetica");
      doc.rect(310, customerBoxY, 235, maxBoxHeight).stroke();
      doc.text(`Name: ${carrier?.name || "N/A"}`, 320, customerBoxY + 10, {
        width: 215,
        ellipsis: true,
      });
      doc.text(`Email: ${carrierEmail}`, 320, customerBoxY + 25, {
        width: 215,
      });
      const carrierPhoneY = customerBoxY + 25 + carrierEmailHeight;
      doc.text(`Phone: ${carrierPhone}`, 320, carrierPhoneY, {
        width: 215,
        ellipsis: true,
      });

      doc.y = customerBoxY + maxBoxHeight + 10;
      doc.moveDown();

      if (order.receiverName) {
        doc.fontSize(12).font("Helvetica-Bold").text("Delivery Address");
        doc.moveDown(0.3);
        doc.fontSize(10).font("Helvetica");
        doc.text(order.receiverName || "");
        if (order.receiverAddressStreet) doc.text(order.receiverAddressStreet);
        const cityStateZip = [
          order.receiverAddressCity,
          order.receiverAddressState,
          order.receiverAddressZipCode,
        ]
          .filter(Boolean)
          .join(", ");
        if (cityStateZip) doc.text(cityStateZip);
        if (order.receiverAddressCountry)
          doc.text(order.receiverAddressCountry);
        doc.moveDown();
      }

      doc.fontSize(12).font("Helvetica-Bold").text("Order Items");
      doc.moveDown(0.5);

      const tableTop = doc.y;
      const tableLeft = 50;
      doc.rect(tableLeft, tableTop, 495, 20).fill("#f0f0f0");
      doc.fillColor("#000000");
      doc.fontSize(10).font("Helvetica-Bold");
      doc.text("Product", tableLeft + 10, tableTop + 5);
      doc.text("Required Qty", tableLeft + 380, tableTop + 5);

      let rowY = tableTop + 25;
      doc.font("Helvetica");

      let totalQuantity = 0;
      for (const item of items) {
        const product = await storage.getProductById(item.productId);
        doc.text(product?.name || item.productId, tableLeft + 10, rowY);
        doc.text(String(item.requiredQuantity || 0), tableLeft + 380, rowY);
        totalQuantity += item.requiredQuantity || 0;
        rowY += 20;
      }

      doc.rect(tableLeft, rowY, 495, 20).fill("#e0e0e0");
      doc.fillColor("#000000");
      doc.font("Helvetica-Bold");
      doc.text("TOTAL", tableLeft + 10, rowY + 5);
      doc.text(String(totalQuantity), tableLeft + 380, rowY + 5);

      doc.y = rowY + 40;
      doc.moveDown();

      doc.fontSize(10).font("Helvetica");
      doc.text(`Pallet Count: ${order.palletCount || 0}`);
      doc.text(`Total Weight: ${order.orderWeight?.toFixed(2) || 0} lbs`);

      addFooter(doc);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateBolPdf(
  bol: Bol,
  items: BolItem[],
  carrier: Contact,
  order: Order,
  customer: Contact,
  settings: Settings | undefined,
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      addHeader(doc);

      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("BILL OF LADING", { align: "center" });
      doc.moveDown(1.5);

      doc.fontSize(12).font("Helvetica-Bold").text("BOL Information");
      doc.moveDown(0.3);
      doc.fontSize(10).font("Helvetica");

      const bolBoxY = doc.y;
      doc.rect(50, bolBoxY, 495, 65).stroke();

      doc.text(`BOL Reference: ${bol.referenceId || "N/A"}`, 60, bolBoxY + 10);
      doc.text(
        `Order Reference: ${order.referenceId || "N/A"}`,
        60,
        bolBoxY + 25,
      );
      doc.text(`PO Number: ${order.poNumber || "N/A"}`, 60, bolBoxY + 40);

      doc.text(`Order Type: ${bol.orderType}`, 300, bolBoxY + 10);
      doc.text(`Created: ${formatDate(bol.createdAt)}`, 300, bolBoxY + 25);

      doc.y = bolBoxY + 75;
      doc.moveDown();

      const warehouses = settings?.warehouses || [];
      const shipper = warehouses[0] || {
        name: COMPANY_NAME,
        address: { street: "", city: "", state: "", zipCode: "", country: "" },
      };

      const addressSectionY = doc.y;

      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Shipper", 50, addressSectionY);
      doc.moveDown(0.3);
      const shipperBoxY = doc.y;
      doc.fontSize(10).font("Helvetica");
      doc.rect(50, shipperBoxY, 230, 75).stroke();
      doc.text(shipper.name, 60, shipperBoxY + 10);
      doc.text(shipper.address?.street || "", 60, shipperBoxY + 25);
      const shipperCityStateZip = [
        shipper.address?.city,
        shipper.address?.state,
        shipper.address?.zipCode,
      ]
        .filter(Boolean)
        .join(", ");
      doc.text(shipperCityStateZip, 60, shipperBoxY + 40);
      doc.text(shipper.address?.country || "", 60, shipperBoxY + 55);

      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Consignee", 310, addressSectionY);
      doc.fontSize(10).font("Helvetica");
      doc.rect(310, shipperBoxY, 235, 75).stroke();
      doc.text(order.receiverName || customer.name, 320, shipperBoxY + 10);
      doc.text(
        order.receiverAddressStreet || customer.addressStreet || "",
        320,
        shipperBoxY + 25,
      );
      const consigneeCityStateZip = [
        order.receiverAddressCity || customer.addressCity,
        order.receiverAddressState || customer.addressState,
        order.receiverAddressZipCode || customer.addressZipCode,
      ]
        .filter(Boolean)
        .join(", ");
      doc.text(consigneeCityStateZip, 320, shipperBoxY + 40);
      doc.text(
        order.receiverAddressCountry || customer.addressCountry || "",
        320,
        shipperBoxY + 55,
      );

      doc.y = shipperBoxY + 85;
      doc.moveDown();

      doc.fontSize(12).font("Helvetica-Bold").text("Carrier Information");
      doc.moveDown(0.3);
      doc.fontSize(10).font("Helvetica");
      doc.text(`Carrier: ${carrier.name}`);
      doc.text(`Phone: ${carrier.phone?.join(", ") || "N/A"}`);
      doc.moveDown();

      doc.fontSize(12).font("Helvetica-Bold").text("Shipment Items");
      doc.moveDown(0.5);

      const tableTop = doc.y;
      const tableLeft = 50;
      doc.rect(tableLeft, tableTop, 495, 20).fill("#f0f0f0");
      doc.fillColor("#000000");
      doc.fontSize(10).font("Helvetica-Bold");
      doc.text("Product", tableLeft + 10, tableTop + 5);
      doc.text("Quantity", tableLeft + 320, tableTop + 5);
      doc.text("Weight", tableLeft + 420, tableTop + 5);

      let rowY = tableTop + 25;
      doc.font("Helvetica");

      let totalQuantity = 0;
      let totalWeight = 0;
      const binWeight = settings?.binWeight || 5;

      for (const item of items) {
        const product = await storage.getProductById(item.productId);
        const itemWeight =
          (item.quantity || 0) * ((product?.weight || 0) + binWeight);
        doc.text(product?.name || item.productId, tableLeft + 10, rowY);
        doc.text(String(item.quantity || 0), tableLeft + 320, rowY);
        doc.text(`${itemWeight.toFixed(2)} lbs`, tableLeft + 420, rowY);
        totalQuantity += item.quantity || 0;
        totalWeight += itemWeight;
        rowY += 20;
      }

      doc.rect(tableLeft, rowY, 495, 20).fill("#e0e0e0");
      doc.fillColor("#000000");
      doc.font("Helvetica-Bold");
      doc.text("TOTAL", tableLeft + 10, rowY + 5);
      doc.text(String(totalQuantity), tableLeft + 320, rowY + 5);
      doc.text(`${totalWeight.toFixed(2)} lbs`, tableLeft + 420, rowY + 5);

      doc.y = rowY + 40;

      doc.fontSize(10).font("Helvetica-Bold").text("Acknowledgment", 50, doc.y, { width: 495 });
      doc.moveDown(0.3);
      doc
        .font("Helvetica")
        .text(
          "Received the above listed goods in apparent good order, except as noted.",
          50,
          doc.y,
          { width: 495 }
        );
      doc.moveDown(1.5);

      const signatureY = doc.y;
      doc.text(
        "Shipper Signature: ____________________________",
        50,
        signatureY,
      );
      doc.text("Date: ______________", 380, signatureY);
      doc.text(
        "Consignee Signature: ____________________________",
        50,
        signatureY + 25,
      );
      doc.text("Date: ______________", 380, signatureY + 25);
      doc.text(
        "Driver Signature: ____________________________",
        50,
        signatureY + 50,
      );
      doc.text("Date: ______________", 380, signatureY + 50);

      addFooter(doc);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export interface ShipmentBolData {
  bol: Bol;
  items: BolItem[];
  tags: string[];
  order: Order | null;
  customer: Contact | null;
}

export async function generateShipmentPdf(
  shipment: Shipment,
  carrier: Contact | null,
  bols: ShipmentBolData[],
  settings: Settings | undefined,
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      addHeader(doc);

      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("SHIPMENT MANIFEST", { align: "center" });
      doc.moveDown(1.5);

      doc.fontSize(12).font("Helvetica-Bold").text("Shipment Information");
      doc.moveDown(0.3);
      doc.fontSize(10).font("Helvetica");

      const shipmentBoxY = doc.y;
      doc.rect(50, shipmentBoxY, 495, 80).stroke();

      doc.text(`Shipment Reference: ${shipment.referenceId || "N/A"}`, 60, shipmentBoxY + 10);
      doc.text(`Order Type: ${shipment.orderType}`, 60, shipmentBoxY + 25);
      doc.text(`Shipment Date: ${formatDate(shipment.shipmentDate)}`, 60, shipmentBoxY + 40);
      doc.text(`Total BOLs: ${bols.length}`, 60, shipmentBoxY + 55);

      doc.text(`Carrier: ${carrier?.name || "N/A"}`, 300, shipmentBoxY + 10);
      doc.text(`Driver: ${shipment.driverName || "N/A"}`, 300, shipmentBoxY + 25);
      doc.text(`Driver License: ${shipment.driverDl || "N/A"}`, 300, shipmentBoxY + 40);
      doc.text(`Status: ${shipment.receivedDate ? "RECEIVED" : "SHIPPED"}`, 300, shipmentBoxY + 55);

      doc.y = shipmentBoxY + 95;
      doc.moveDown();

      doc.fontSize(12).font("Helvetica-Bold").text("Bills of Lading");
      doc.moveDown(0.5);

      const tableTop = doc.y;
      const tableLeft = 50;
      const colWidths = [120, 120, 140, 80];

      doc.fontSize(9).font("Helvetica-Bold");
      doc.rect(tableLeft, tableTop, 495, 20).stroke();
      doc.text("BOL Reference", tableLeft + 5, tableTop + 6);
      doc.text("Order Reference", tableLeft + colWidths[0] + 5, tableTop + 6);
      doc.text("Customer", tableLeft + colWidths[0] + colWidths[1] + 5, tableTop + 6);
      doc.text("Items", tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + 5, tableTop + 6);

      doc.font("Helvetica");
      let currentY = tableTop + 20;

      for (const bolData of bols) {
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }

        const rowHeight = 18;
        doc.rect(tableLeft, currentY, 495, rowHeight).stroke();

        doc.text(bolData.bol.referenceId || "N/A", tableLeft + 5, currentY + 5, { width: colWidths[0] - 10 });
        doc.text(bolData.order?.referenceId || "N/A", tableLeft + colWidths[0] + 5, currentY + 5, { width: colWidths[1] - 10 });
        doc.text(bolData.customer?.name || "N/A", tableLeft + colWidths[0] + colWidths[1] + 5, currentY + 5, { width: colWidths[2] - 10 });
        
        const totalItems = bolData.items.reduce((acc, item) => acc + (item.quantity || 0), 0);
        doc.text(totalItems.toString(), tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + 5, currentY + 5);

        currentY += rowHeight;
      }

      doc.y = currentY + 20;
      doc.moveDown();

      const signatureY = Math.min(doc.y, 720);
      doc.fontSize(10).font("Helvetica");
      doc.text("Shipper Signature: ____________________________", 50, signatureY);
      doc.text("Date: ______________", 380, signatureY);
      doc.text("Driver Signature: ____________________________", 50, signatureY + 25);
      doc.text("Date: ______________", 380, signatureY + 25);

      addFooter(doc);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
