import PDFDocument from "pdfkit";
import type { PDFDocument as PDFDocumentType } from "pdfkit";
import { Order, OrderItem, Contact, Bol, BolItem, Settings } from "@shared/schema";
import { storage } from "../storage";
import path from "path";
import fs from "fs";

const COMPANY_NAME = "CleanTech Asset Tracking";
const COMPANY_ADDRESS = "123 Clean Street, Green City, EC 12345";

const CLEANTEC_LOGO_PATH = path.join(process.cwd(), "server/assets/cleantec-logo.png");
const MYWORKAPP_LOGO_PATH = path.join(process.cwd(), "server/assets/myworkapp-icon.png");

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
    doc.fontSize(24).font("Helvetica-Bold").text(COMPANY_NAME, 50, startY, { align: "center" });
  }
  
  doc.fontSize(10).font("Helvetica").text(COMPANY_ADDRESS, 50, doc.y, { align: "center" });
  doc.moveDown();
}

function addFooter(doc: InstanceType<typeof PDFDocument>) {
  // Fixed footer position at bottom of current page (A4: 842 points height)
  const footerY = 760;
  
  // Use lineBreak: false to prevent auto-pagination when writing at fixed positions
  if (fs.existsSync(MYWORKAPP_LOGO_PATH)) {
    doc.image(MYWORKAPP_LOGO_PATH, 260, footerY, { width: 30 });
    doc.fontSize(8).font("Helvetica").text("Powered by MyWorkApp.io", 295, footerY + 8, { lineBreak: false });
  } else {
    doc.fontSize(8).font("Helvetica").text("Powered by MyWorkApp.io", 50, footerY, { align: "center", lineBreak: false });
  }
  
  doc.fontSize(7).text(
    `Generated on ${new Date().toLocaleString()}`,
    50, footerY + 25,
    { align: "center", width: 495, lineBreak: false }
  );
}

export async function generateOrderPdf(
  order: Order,
  items: OrderItem[],
  customer: Contact,
  carrier: Contact | null
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      addHeader(doc);

      doc.fontSize(18).font("Helvetica-Bold").text("ORDER CONFIRMATION", { align: "center" });
      doc.moveDown(1.5);

      doc.fontSize(12).font("Helvetica-Bold").text("Order Information");
      doc.moveDown(0.3);
      doc.fontSize(10).font("Helvetica");
      
      const orderBoxY = doc.y;
      doc.rect(50, orderBoxY, 495, 85).stroke();
      
      doc.text(`Order Reference: ${order.referenceId || "N/A"}`, 60, orderBoxY + 10);
      doc.text(`PO Number: ${order.poNumber || "N/A"}`, 60, orderBoxY + 25);
      doc.text(`Order Type: ${order.type}`, 60, orderBoxY + 40);
      doc.text(`Status: ${order.status}`, 60, orderBoxY + 55);
      
      doc.text(`Required Date: ${formatDate(order.requiredDate)}`, 300, orderBoxY + 10);
      doc.text(`Ship Date: ${formatDate(order.shipDate)}`, 300, orderBoxY + 25);
      doc.text(`Created: ${formatDate(order.createdAt)}`, 300, orderBoxY + 40);
      
      doc.y = orderBoxY + 95;
      doc.moveDown();

      const infoSectionY = doc.y;
      
      doc.fontSize(12).font("Helvetica-Bold").text("Customer Information", 50, infoSectionY);
      doc.moveDown(0.3);
      const customerBoxY = doc.y;
      doc.fontSize(10).font("Helvetica");
      
      // Calculate dynamic heights based on content
      const customerEmail = customer.email?.join(", ") || "N/A";
      const customerPhone = customer.phone?.join(", ") || "N/A";
      const carrierEmail = carrier?.email?.join(", ") || "N/A";
      const carrierPhone = carrier?.phone?.join(", ") || "N/A";
      
      // Measure text heights
      const customerEmailHeight = doc.heightOfString(`Email: ${customerEmail}`, { width: 210 });
      const customerPhoneHeight = doc.heightOfString(`Phone: ${customerPhone}`, { width: 210 });
      const carrierEmailHeight = doc.heightOfString(`Email: ${carrierEmail}`, { width: 215 });
      const carrierPhoneHeight = doc.heightOfString(`Phone: ${carrierPhone}`, { width: 215 });
      
      // Calculate box height: name(15) + padding(10) + email + phone + padding(10)
      const customerBoxHeight = 10 + 15 + customerEmailHeight + customerPhoneHeight + 10;
      const carrierBoxHeight = 10 + 15 + carrierEmailHeight + carrierPhoneHeight + 10;
      const maxBoxHeight = Math.max(customerBoxHeight, carrierBoxHeight, 65);
      
      doc.rect(50, customerBoxY, 230, maxBoxHeight).stroke();
      doc.text(`Name: ${customer.name}`, 60, customerBoxY + 10, { width: 210, ellipsis: true });
      doc.text(`Email: ${customerEmail}`, 60, customerBoxY + 25, { width: 210 });
      const customerPhoneY = customerBoxY + 25 + customerEmailHeight;
      doc.text(`Phone: ${customerPhone}`, 60, customerPhoneY, { width: 210, ellipsis: true });

      doc.fontSize(12).font("Helvetica-Bold").text("Carrier Information", 310, infoSectionY);
      doc.fontSize(10).font("Helvetica");
      doc.rect(310, customerBoxY, 235, maxBoxHeight).stroke();
      doc.text(`Name: ${carrier?.name || "N/A"}`, 320, customerBoxY + 10, { width: 215, ellipsis: true });
      doc.text(`Email: ${carrierEmail}`, 320, customerBoxY + 25, { width: 215 });
      const carrierPhoneY = customerBoxY + 25 + carrierEmailHeight;
      doc.text(`Phone: ${carrierPhone}`, 320, carrierPhoneY, { width: 215, ellipsis: true });

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
        ].filter(Boolean).join(", ");
        if (cityStateZip) doc.text(cityStateZip);
        if (order.receiverAddressCountry) doc.text(order.receiverAddressCountry);
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
  settings: Settings | undefined
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      addHeader(doc);

      doc.fontSize(18).font("Helvetica-Bold").text("BILL OF LADING", { align: "center" });
      doc.moveDown(1.5);

      doc.fontSize(12).font("Helvetica-Bold").text("BOL Information");
      doc.moveDown(0.3);
      doc.fontSize(10).font("Helvetica");
      
      const bolBoxY = doc.y;
      doc.rect(50, bolBoxY, 495, 65).stroke();
      
      doc.text(`BOL Reference: ${bol.referenceId || "N/A"}`, 60, bolBoxY + 10);
      doc.text(`Order Reference: ${order.referenceId || "N/A"}`, 60, bolBoxY + 25);
      doc.text(`PO Number: ${order.poNumber || "N/A"}`, 60, bolBoxY + 40);
      
      doc.text(`Order Type: ${bol.orderType}`, 300, bolBoxY + 10);
      doc.text(`Created: ${formatDate(bol.createdAt)}`, 300, bolBoxY + 25);

      doc.y = bolBoxY + 75;
      doc.moveDown();

      const warehouses = settings?.warehouses || [];
      const shipper = warehouses[0] || { name: COMPANY_NAME, address: { street: "", city: "", state: "", zipCode: "", country: "" } };

      const addressSectionY = doc.y;
      
      doc.fontSize(12).font("Helvetica-Bold").text("Shipper", 50, addressSectionY);
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
      ].filter(Boolean).join(", ");
      doc.text(shipperCityStateZip, 60, shipperBoxY + 40);
      doc.text(shipper.address?.country || "", 60, shipperBoxY + 55);

      doc.fontSize(12).font("Helvetica-Bold").text("Consignee", 310, addressSectionY);
      doc.fontSize(10).font("Helvetica");
      doc.rect(310, shipperBoxY, 235, 75).stroke();
      doc.text(order.receiverName || customer.name, 320, shipperBoxY + 10);
      doc.text(order.receiverAddressStreet || customer.addressStreet || "", 320, shipperBoxY + 25);
      const consigneeCityStateZip = [
        order.receiverAddressCity || customer.addressCity,
        order.receiverAddressState || customer.addressState,
        order.receiverAddressZipCode || customer.addressZipCode,
      ].filter(Boolean).join(", ");
      doc.text(consigneeCityStateZip, 320, shipperBoxY + 40);
      doc.text(order.receiverAddressCountry || customer.addressCountry || "", 320, shipperBoxY + 55);

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
        const itemWeight = (item.quantity || 0) * ((product?.weight || 0) + binWeight);
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
      doc.moveDown();

      doc.fontSize(10).font("Helvetica-Bold").text("Acknowledgment");
      doc.moveDown(0.3);
      doc.font("Helvetica").text(
        "Received the above listed goods in apparent good order, except as noted."
      );
      doc.moveDown(1.5);

      const signatureY = doc.y;
      doc.text("Shipper Signature: ____________________________", 50, signatureY);
      doc.text("Date: ______________", 380, signatureY);
      doc.text("Consignee Signature: ____________________________", 50, signatureY + 25);
      doc.text("Date: ______________", 380, signatureY + 25);
      doc.text("Driver Signature: ____________________________", 50, signatureY + 50);
      doc.text("Date: ______________", 380, signatureY + 50);

      addFooter(doc);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
