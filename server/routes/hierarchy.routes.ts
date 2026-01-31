import { Router } from "express";
import { storage } from "../storage";
import { authenticateMiddleware, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

// Get hierarchy levels
router.get("/levels", authenticateMiddleware, async (req, res, next) => {
  try {
    const levels = await storage.getHierarchyLevels();
    res.json({ success: true, data: levels });
  } catch (error) {
    next(error);
  }
});

// Create hierarchy level
router.post("/levels", authenticateMiddleware, async (req: AuthenticatedRequest, res, next) => {
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

// Get hierarchy nodes
router.get("/nodes", authenticateMiddleware, async (req, res, next) => {
  try {
    const nodes = await storage.getHierarchyNodes(
      req.query.levelId as string,
      req.query.parentId as string
    );
    res.json({ success: true, data: nodes });
  } catch (error) {
    next(error);
  }
});

// Create hierarchy node
router.post("/nodes", authenticateMiddleware, async (req: AuthenticatedRequest, res, next) => {
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

// Get full hierarchy tree
router.get("", authenticateMiddleware, async (req, res, next) => {
  try {
    const levels = await storage.getHierarchyLevels();
    const nodes = await storage.getHierarchyNodes();

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

    res.json({ success: true, data: { levels, tree } });
  } catch (error) {
    next(error);
  }
});

export default router;
