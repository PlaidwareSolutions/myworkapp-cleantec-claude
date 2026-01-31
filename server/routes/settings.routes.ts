import { Router } from "express";
import { storage } from "../storage";
import { authenticateMiddleware, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

// Get settings
router.get("", authenticateMiddleware, async (req, res, next) => {
  try {
    let settings = await storage.getSettings();
    
    if (!settings) {
      // Create default settings if none exist
      settings = await storage.upsertSettings({
        binsPerPallet: 48,
        palletWeight: 50,
        binWeight: 5,
        warehouses: [],
        emailSettings: {},
      });
    }

    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

// Update settings
router.put("", authenticateMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const permissions = req.user!.permissions;
    if (!permissions.admin) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const currentSettings = await storage.getSettings();
    
    const updateData: any = {};
    
    if (req.body.binsPerPallet !== undefined) updateData.binsPerPallet = req.body.binsPerPallet;
    if (req.body.palletWeight !== undefined) updateData.palletWeight = req.body.palletWeight;
    if (req.body.binWeight !== undefined) updateData.binWeight = req.body.binWeight;
    if (req.body.warehouses !== undefined) updateData.warehouses = req.body.warehouses;
    if (req.body.emailSettings !== undefined) updateData.emailSettings = req.body.emailSettings;

    const settings = await storage.upsertSettings({
      ...currentSettings,
      ...updateData,
    });

    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

export default router;
