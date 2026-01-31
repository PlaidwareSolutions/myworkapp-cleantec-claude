import { Router, Response } from "express";
import { storage } from "../storage";
import { authenticateMiddleware, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

// Get hierarchy levels (must be before /:id route)
router.get("/levels", authenticateMiddleware, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const levels = await storage.getHierarchyLevels(req.query.hierarchyId as string);
    res.json({ success: true, data: levels });
  } catch (error) {
    next(error);
  }
});

// Create hierarchy level
router.post("/levels", authenticateMiddleware, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const level = await storage.createHierarchyLevel({
      ...req.body,
      createdBy: req.user!.id,
    });
    res.json({ success: true, data: level });
  } catch (error) {
    next(error);
  }
});

// Update hierarchy level
router.put("/levels/:id", authenticateMiddleware, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const level = await storage.updateHierarchyLevel(req.params.id, {
      ...req.body,
      updatedBy: req.user!.id,
    });
    if (!level) {
      return res.status(404).json({ success: false, message: "Hierarchy level not found" });
    }
    res.json({ success: true, data: level });
  } catch (error) {
    next(error);
  }
});

// Delete hierarchy level
router.delete("/levels/:id", authenticateMiddleware, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const deleted = await storage.deleteHierarchyLevel(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Hierarchy level not found" });
    }
    res.json({ success: true, message: "Hierarchy level deleted" });
  } catch (error) {
    next(error);
  }
});

// Get hierarchy nodes (must be before /:id route)
router.get("/nodes", authenticateMiddleware, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const nodes = await storage.getHierarchyNodes(
      req.query.hierarchyId as string,
      req.query.levelId as string,
      req.query.parentId as string
    );
    res.json({ success: true, data: nodes });
  } catch (error) {
    next(error);
  }
});

// Create hierarchy node
router.post("/nodes", authenticateMiddleware, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const node = await storage.createHierarchyNode({
      ...req.body,
      createdBy: req.user!.id,
    });
    res.json({ success: true, data: node });
  } catch (error) {
    next(error);
  }
});

// Update hierarchy node
router.put("/nodes/:id", authenticateMiddleware, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const node = await storage.updateHierarchyNode(req.params.id, {
      ...req.body,
      updatedBy: req.user!.id,
    });
    if (!node) {
      return res.status(404).json({ success: false, message: "Hierarchy node not found" });
    }
    res.json({ success: true, data: node });
  } catch (error) {
    next(error);
  }
});

// Delete hierarchy node
router.delete("/nodes/:id", authenticateMiddleware, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const deleted = await storage.deleteHierarchyNode(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Hierarchy node not found" });
    }
    res.json({ success: true, message: "Hierarchy node deleted" });
  } catch (error) {
    next(error);
  }
});

// Get all hierarchies
router.get("/", authenticateMiddleware, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const hierarchiesList = await storage.getHierarchies();
    res.json({ success: true, data: hierarchiesList });
  } catch (error) {
    next(error);
  }
});

// Create hierarchy
router.post("/", authenticateMiddleware, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const hierarchy = await storage.createHierarchy({
      ...req.body,
      createdBy: req.user!.id,
    });
    res.json({ success: true, data: hierarchy });
  } catch (error) {
    next(error);
  }
});

// Get hierarchy by ID
router.get("/:id", authenticateMiddleware, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const hierarchy = await storage.getHierarchyById(req.params.id);
    if (!hierarchy) {
      return res.status(404).json({ success: false, message: "Hierarchy not found" });
    }
    
    // Get levels and nodes for this hierarchy
    const levels = await storage.getHierarchyLevels(req.params.id);
    const nodes = await storage.getHierarchyNodes(req.params.id);
    
    res.json({ success: true, data: { ...hierarchy, levels, nodes } });
  } catch (error) {
    next(error);
  }
});

// Get full hierarchy tree for a specific hierarchy
router.get("/:id/tree", authenticateMiddleware, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const hierarchy = await storage.getHierarchyById(req.params.id);
    if (!hierarchy) {
      return res.status(404).json({ success: false, message: "Hierarchy not found" });
    }
    
    const levels = await storage.getHierarchyLevels(req.params.id);
    const nodes = await storage.getHierarchyNodes(req.params.id);

    // Build tree structure
    const buildTree = (parentId: string | null): any[] => {
      return nodes
        .filter(node => node.parentId === parentId)
        .map(node => ({
          ...node,
          children: buildTree(node.id),
        }));
    };

    const tree = buildTree(null);

    res.json({ success: true, data: { hierarchy, levels, tree } });
  } catch (error) {
    next(error);
  }
});

// Update hierarchy
router.put("/:id", authenticateMiddleware, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const hierarchy = await storage.updateHierarchy(req.params.id, {
      ...req.body,
      updatedBy: req.user!.id,
    });
    if (!hierarchy) {
      return res.status(404).json({ success: false, message: "Hierarchy not found" });
    }
    res.json({ success: true, data: hierarchy });
  } catch (error) {
    next(error);
  }
});

// Delete hierarchy
router.delete("/:id", authenticateMiddleware, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const deleted = await storage.deleteHierarchy(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Hierarchy not found" });
    }
    res.json({ success: true, message: "Hierarchy deleted" });
  } catch (error) {
    next(error);
  }
});

export default router;
