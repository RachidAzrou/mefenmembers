import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Material usage tracking
  app.post("/api/material-usage", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "medic") return res.sendStatus(403);

    try {
      const usage = await storage.createMaterialUsage({
        ...req.body,
        userId: req.user.id,
      });

      // Update inventory levels
      await storage.updateInventoryLevel(usage.materialTypeId, -usage.quantity);

      // Check if we need to send low stock notification
      const inventory = await storage.getInventory(usage.materialTypeId);
      if (inventory && inventory.stockLevel <= inventory.minimumLevel) {
        // TODO: Implement notification system
        console.log(`Low stock alert for material ${usage.materialTypeId}`);
      }

      res.status(201).json(usage);
    } catch (error) {
      res.status(500).json({ message: "Failed to record material usage" });
    }
  });

  // Get inventory levels
  app.get("/api/inventory", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "medic") return res.sendStatus(403);

    try {
      const inventory = await storage.getAllInventory();
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}