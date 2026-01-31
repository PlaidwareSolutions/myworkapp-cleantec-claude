import PDFDocument from "pdfkit";
import { Order, OrderItem, Contact, Bol, BolItem, Settings } from "@shared/schema";
import { storage } from "../storage";

const COMPANY_NAME = "CleanTech Asset Tracking";
const COMPANY_ADDRESS = "123 Clean Street, Green City, EC 12345";

function formatDate(date: Date | null | undefined): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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

      // Header
      doc.fontSize(24).font("Helvetica-Bold").text(COMPANY_NAME, { align: "center" });
      doc.fontSize(10).font("Helvetica").text(COMPANY_ADDRESS, { align: "center" });
      doc.moveDown();

      // Title
      doc.fontSize(18).font("Helvetica-Bold").text("ORDER CONFIRMATION", { align: "center" });
      doc.moveDown();

      // Order Info Box
      doc.fontSize(12).font("Helvetica-Bold").text("Order Information");
      doc.fontSize(10).font("Helvetica");
      doc.rect(50, doc.y, 495, 80).stroke();
      const orderInfoY = doc.y + 10;
      
      doc.text(`Order Reference: ${order.referenceId || "N/A"}`, 60, orderInfoY);
      doc.text(`PO Number: ${order.poNumber || "N/A"}`, 60, orderInfoY + 15);
      doc.text(`Order Type: ${order.type}`, 60, orderInfoY + 30);
      doc.text(`Status: ${order.status}`, 60, orderInfoY + 45);
      
      doc.text(`Required Date: ${formatDate(order.requiredDate)}`, 300, orderInfoY);
      doc.text(`Ship Date: ${formatDate(order.shipDate)}`, 300, orderInfoY + 15);
      doc.text(`Created: ${formatDate(order.createdAt)}`, 300, orderInfoY + 30);
      
      doc.y = orderInfoY + 70;
      doc.moveDown();

      // Customer Info
      doc.fontSize(12).font("Helvetica-Bold").text("Customer Information");
      doc.fontSize(10).font("Helvetica");
      doc.rect(50, doc.y, 240, 60).stroke();
      const customerInfoY = doc.y + 10;
      doc.text(`Name: ${customer.name}`, 60, customerInfoY);
      doc.text(`Email: ${customer.email?.join(", ") || "N/A"}`, 60, customerInfoY + 15);
      doc.text(`Phone: ${customer.phone?.join(", ") || "N/A"}`, 60, customerInfoY + 30);

      // Carrier Info
      doc.fontSize(12).font("Helvetica-Bold").text("Carrier Information", 305, customerInfoY - 20);
      doc.fontSize(10).font("Helvetica");
      doc.rect(305, customerInfoY - 10, 240, 60).stroke();
      doc.text(`Name: ${carrier?.name || "N/A"}`, 315, customerInfoY);
      doc.text(`Email: ${carrier?.email?.join(", ") || "N/A"}`, 315, customerInfoY + 15);
      doc.text(`Phone: ${carrier?.phone?.join(", ") || "N/A"}`, 315, customerInfoY + 30);

      doc.y = customerInfoY + 60;
      doc.moveDown(2);

      // Receiver Address (if outbound)
      if (order.receiverName) {
        doc.fontSize(12).font("Helvetica-Bold").text("Delivery Address");
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

      // Items Table
      doc.fontSize(12).font("Helvetica-Bold").text("Order Items");
      doc.moveDown(0.5);

      // Table Header
      const tableTop = doc.y;
      const tableLeft = 50;
      doc.rect(tableLeft, tableTop, 495, 20).fill("#f0f0f0");
      doc.fillColor("#000000");
      doc.fontSize(10).font("Helvetica-Bold");
      doc.text("Product", tableLeft + 10, tableTop + 5);
      doc.text("Required Qty", tableLeft + 350, tableTop + 5);

      // Table Rows
      let rowY = tableTop + 25;
      doc.font("Helvetica");

      let totalQuantity = 0;
      for (const item of items) {
        const product = await storage.getProductById(item.productId);
        doc.text(product?.name || item.productId, tableLeft + 10, rowY);
        doc.text(String(item.requiredQuantity || 0), tableLeft + 350, rowY);
        totalQuantity += item.requiredQuantity || 0;
        rowY += 20;
      }

      // Total row
      doc.rect(tableLeft, rowY, 495, 20).fill("#e0e0e0");
      doc.fillColor("#000000");
      doc.font("Helvetica-Bold");
      doc.text("TOTAL", tableLeft + 10, rowY + 5);
      doc.text(String(totalQuantity), tableLeft + 350, rowY + 5);

      doc.y = rowY + 40;
      doc.moveDown();

      // Weight Information
      doc.fontSize(10).font("Helvetica");
      doc.text(`Pallet Count: ${order.palletCount || 0}`);
      doc.text(`Total Weight: ${order.orderWeight?.toFixed(2) || 0} lbs`);

      // Footer
      doc.y = 750;
      doc.fontSize(8).text(
        `Generated on ${new Date().toLocaleString()} | ${COMPANY_NAME}`,
        { align: "center" }
      );

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

      // Header
      doc.fontSize(24).font("Helvetica-Bold").text(COMPANY_NAME, { align: "center" });
      doc.fontSize(10).font("Helvetica").text(COMPANY_ADDRESS, { align: "center" });
      doc.moveDown();

      // Title
      doc.fontSize(18).font("Helvetica-Bold").text("BILL OF LADING", { align: "center" });
      doc.moveDown();

      // BOL Info Box
      doc.fontSize(12).font("Helvetica-Bold").text("BOL Information");
      doc.fontSize(10).font("Helvetica");
      doc.rect(50, doc.y, 495, 60).stroke();
      const bolInfoY = doc.y + 10;
      
      doc.text(`BOL Reference: ${bol.referenceId || "N/A"}`, 60, bolInfoY);
      doc.text(`Order Reference: ${order.referenceId || "N/A"}`, 60, bolInfoY + 15);
      doc.text(`PO Number: ${order.poNumber || "N/A"}`, 60, bolInfoY + 30);
      
      doc.text(`Order Type: ${bol.orderType}`, 300, bolInfoY);
      doc.text(`Created: ${formatDate(bol.createdAt)}`, 300, bolInfoY + 15);

      doc.y = bolInfoY + 50;
      doc.moveDown();

      // Shipper Info
      const warehouses = settings?.warehouses || [];
      const shipper = warehouses[0] || { name: COMPANY_NAME, address: { street: "", city: "", state: "", zipCode: "", country: "" } };

      doc.fontSize(12).font("Helvetica-Bold").text("Shipper");
      doc.fontSize(10).font("Helvetica");
      doc.rect(50, doc.y, 240, 70).stroke();
      const shipperInfoY = doc.y + 10;
      doc.text(shipper.name, 60, shipperInfoY);
      doc.text(shipper.address?.street || "", 60, shipperInfoY + 15);
      const shipperCityStateZip = [
        shipper.address?.city,
        shipper.address?.state,
        shipper.address?.zipCode,
      ].filter(Boolean).join(", ");
      doc.text(shipperCityStateZip, 60, shipperInfoY + 30);
      doc.text(shipper.address?.country || "", 60, shipperInfoY + 45);

      // Consignee Info
      doc.fontSize(12).font("Helvetica-Bold").text("Consignee", 305, shipperInfoY - 20);
      doc.fontSize(10).font("Helvetica");
      doc.rect(305, shipperInfoY - 10, 240, 70).stroke();
      doc.text(order.receiverName || customer.name, 315, shipperInfoY);
      doc.text(order.receiverAddressStreet || customer.addressStreet || "", 315, shipperInfoY + 15);
      const consigneeCityStateZip = [
        order.receiverAddressCity || customer.addressCity,
        order.receiverAddressState || customer.addressState,
        order.receiverAddressZipCode || customer.addressZipCode,
      ].filter(Boolean).join(", ");
      doc.text(consigneeCityStateZip, 315, shipperInfoY + 30);
      doc.text(order.receiverAddressCountry || customer.addressCountry || "", 315, shipperInfoY + 45);

      doc.y = shipperInfoY + 70;
      doc.moveDown();

      // Carrier Info
      doc.fontSize(12).font("Helvetica-Bold").text("Carrier Information");
      doc.fontSize(10).font("Helvetica");
      doc.text(`Carrier: ${carrier.name}`);
      doc.text(`Phone: ${carrier.phone?.join(", ") || "N/A"}`);
      doc.moveDown();

      // Items Table
      doc.fontSize(12).font("Helvetica-Bold").text("Shipment Items");
      doc.moveDown(0.5);

      // Table Header
      const tableTop = doc.y;
      const tableLeft = 50;
      doc.rect(tableLeft, tableTop, 495, 20).fill("#f0f0f0");
      doc.fillColor("#000000");
      doc.fontSize(10).font("Helvetica-Bold");
      doc.text("Product", tableLeft + 10, tableTop + 5);
      doc.text("Quantity", tableLeft + 350, tableTop + 5);
      doc.text("Weight", tableLeft + 420, tableTop + 5);

      // Table Rows
      let rowY = tableTop + 25;
      doc.font("Helvetica");

      let totalQuantity = 0;
      let totalWeight = 0;
      const binWeight = settings?.binWeight || 5;

      for (const item of items) {
        const product = await storage.getProductById(item.productId);
        const itemWeight = (item.quantity || 0) * ((product?.weight || 0) + binWeight);
        doc.text(product?.name || item.productId, tableLeft + 10, rowY);
        doc.text(String(item.quantity || 0), tableLeft + 350, rowY);
        doc.text(`${itemWeight.toFixed(2)} lbs`, tableLeft + 420, rowY);
        totalQuantity += item.quantity || 0;
        totalWeight += itemWeight;
        rowY += 20;
      }

      // Total row
      doc.rect(tableLeft, rowY, 495, 20).fill("#e0e0e0");
      doc.fillColor("#000000");
      doc.font("Helvetica-Bold");
      doc.text("TOTAL", tableLeft + 10, rowY + 5);
      doc.text(String(totalQuantity), tableLeft + 350, rowY + 5);
      doc.text(`${totalWeight.toFixed(2)} lbs`, tableLeft + 420, rowY + 5);

      doc.y = rowY + 40;
      doc.moveDown(2);

      // Signature Section
      doc.fontSize(10).font("Helvetica-Bold").text("Acknowledgment");
      doc.moveDown(0.5);
      doc.font("Helvetica").text(
        "Received the above listed goods in apparent good order, except as noted."
      );
      doc.moveDown(2);

      const signatureY = doc.y;
      doc.text("Shipper Signature: ____________________________", 50, signatureY);
      doc.text("Date: ______________", 350, signatureY);
      doc.moveDown();
      doc.text("Consignee Signature: ____________________________", 50, signatureY + 30);
      doc.text("Date: ______________", 350, signatureY + 30);
      doc.moveDown();
      doc.text("Driver Signature: ____________________________", 50, signatureY + 60);
      doc.text("Date: ______________", 350, signatureY + 60);

      // Footer
      doc.y = 750;
      doc.fontSize(8).text(
        `Generated on ${new Date().toLocaleString()} | ${COMPANY_NAME}`,
        { align: "center" }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
