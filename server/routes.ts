import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupSwagger } from "./swagger";

import userRoutes from "./routes/user.routes";
import contactRoutes from "./routes/contact.routes";
import entityRoutes from "./routes/entity.routes";
import orderRoutes from "./routes/order.routes";
import trackingRoutes from "./routes/tracking.routes";
import statsRoutes from "./routes/stats.routes";
import settingsRoutes from "./routes/settings.routes";
import hierarchyRoutes from "./routes/hierarchy.routes";
import docsRoutes from "./routes/docs.routes";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Swagger documentation at /api-docs
  setupSwagger(app);

  // API routes (primary /api prefix)
  app.use("/api/user", userRoutes);
  app.use("/api/contact", contactRoutes);
  app.use("/api/entity", entityRoutes);
  app.use("/api/order", orderRoutes);
  app.use("/api/tracking", trackingRoutes);
  app.use("/api/stats", statsRoutes);
  app.use("/api/settings", settingsRoutes);
  app.use("/api/hierarchy", hierarchyRoutes);
  app.use("/api/docs", docsRoutes);

  // Alternate /v1 prefix for external clients (mobile apps, etc.)
  app.use("/v1/user", userRoutes);
  app.use("/v1/contact", contactRoutes);
  app.use("/v1/entity", entityRoutes);
  app.use("/v1/order", orderRoutes);
  app.use("/v1/tracking", trackingRoutes);
  app.use("/v1/stats", statsRoutes);
  app.use("/v1/settings", settingsRoutes);
  app.use("/v1/hierarchy", hierarchyRoutes);
  app.use("/v1/docs", docsRoutes);

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ success: true, message: "CleanTech API is running", timestamp: new Date().toISOString() });
  });
  app.get("/v1/health", (req, res) => {
    res.json({ success: true, message: "CleanTech API is running", timestamp: new Date().toISOString() });
  });

  // Error handling middleware
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("API Error:", err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  });

  return httpServer;
}
