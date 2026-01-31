import nodemailer from "nodemailer";
import { storage } from "../storage";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.example.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

const FROM_EMAIL = process.env.SMTP_FROM || "noreply@cleantech.com";
const APP_NAME = "CleanTech Asset Tracking";

interface OrderEmailData {
  referenceId: string;
  poNumber: string;
  customerName: string;
  customerEmail: string[];
  carrierName?: string;
  status: string;
  requiredDate?: Date;
  type: string;
}

async function getOrderEmailData(orderId: string): Promise<OrderEmailData | null> {
  const order = await storage.getOrderById(orderId);
  if (!order) return null;

  const customer = await storage.getContactById(order.customerId);
  if (!customer) return null;

  const carrier = order.carrierId ? await storage.getContactById(order.carrierId) : null;

  return {
    referenceId: order.referenceId || "",
    poNumber: order.poNumber || "",
    customerName: customer.name,
    customerEmail: customer.email || [],
    carrierName: carrier?.name,
    status: order.status || "",
    requiredDate: order.requiredDate || undefined,
    type: order.type || "",
  };
}

function generateOrderEmailHtml(data: OrderEmailData, action: string): string {
  const actionTitles: Record<string, string> = {
    created: "Order Created",
    approved: "Order Approved",
    shipped: "Order Shipped",
    cancelled: "Order Cancelled",
    received: "Order Received",
  };

  const actionMessages: Record<string, string> = {
    created: "A new order has been created and is awaiting approval.",
    approved: "Your order has been approved and is being prepared for shipment.",
    shipped: "Your order has been shipped.",
    cancelled: "Your order has been cancelled.",
    received: "Your order has been received.",
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${actionTitles[action] || "Order Update"}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9fafb; }
    .order-details { background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
    .detail-label { font-weight: bold; color: #666; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${APP_NAME}</h1>
      <h2>${actionTitles[action] || "Order Update"}</h2>
    </div>
    <div class="content">
      <p>Dear ${data.customerName},</p>
      <p>${actionMessages[action] || "There has been an update to your order."}</p>
      
      <div class="order-details">
        <h3>Order Details</h3>
        <div class="detail-row">
          <span class="detail-label">Order Reference:</span>
          <span>${data.referenceId}</span>
        </div>
        ${data.poNumber ? `
        <div class="detail-row">
          <span class="detail-label">PO Number:</span>
          <span>${data.poNumber}</span>
        </div>
        ` : ""}
        <div class="detail-row">
          <span class="detail-label">Order Type:</span>
          <span>${data.type}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Status:</span>
          <span>${data.status}</span>
        </div>
        ${data.carrierName ? `
        <div class="detail-row">
          <span class="detail-label">Carrier:</span>
          <span>${data.carrierName}</span>
        </div>
        ` : ""}
        ${data.requiredDate ? `
        <div class="detail-row">
          <span class="detail-label">Required Date:</span>
          <span>${new Date(data.requiredDate).toLocaleDateString()}</span>
        </div>
        ` : ""}
      </div>
      
      <p>If you have any questions, please contact our support team.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export async function sendOrderNotificationEmail(orderId: string, action: string): Promise<boolean> {
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      console.log(`Email notification skipped (SMTP not configured): Order ${orderId} - ${action}`);
      return false;
    }

    const data = await getOrderEmailData(orderId);
    if (!data) {
      console.error(`Failed to get order data for email: ${orderId}`);
      return false;
    }

    if (!data.customerEmail || data.customerEmail.length === 0) {
      console.log(`No email addresses for customer: ${data.customerName}`);
      return false;
    }

    const settings = await storage.getSettings();
    const emailSettings = settings?.emailSettings as Record<string, any> || {};

    // Check if notifications are enabled for this action
    const notificationKey = `notify${action.charAt(0).toUpperCase() + action.slice(1)}`;
    if (emailSettings[notificationKey] === false) {
      console.log(`Email notification disabled for: ${action}`);
      return false;
    }

    const html = generateOrderEmailHtml(data, action);
    const subject = `[${APP_NAME}] Order ${data.referenceId} - ${action.charAt(0).toUpperCase() + action.slice(1)}`;

    await transporter.sendMail({
      from: FROM_EMAIL,
      to: data.customerEmail.join(", "),
      subject,
      html,
    });

    console.log(`Email sent: Order ${orderId} - ${action} to ${data.customerEmail.join(", ")}`);
    return true;
  } catch (error) {
    console.error(`Failed to send email for order ${orderId}:`, error);
    return false;
  }
}

export async function sendCustomEmail(to: string[], subject: string, html: string): Promise<boolean> {
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      console.log("Email skipped (SMTP not configured)");
      return false;
    }

    await transporter.sendMail({
      from: FROM_EMAIL,
      to: to.join(", "),
      subject,
      html,
    });

    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}
