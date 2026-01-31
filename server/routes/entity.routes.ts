import { Router } from "express";
import multer from "multer";
import { parse } from "csv-parse";
import fs from "fs/promises";
import { storage, getPagination } from "../storage";
import { authenticateMiddleware, AuthenticatedRequest } from "../middleware/auth";

const router = Router();
const upload = multer({ dest: "/tmp/uploads/" });

// Custom Fields
router.post("/customfields/create", authenticateMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const customField = await storage.createCustomField({
      ...req.body,
      createdBy: req.user!.id,
    });
    res.json({ success: true, data: customField });
  } catch (error) {
    next(error);
  }
});

router.get("/customfields", authenticateMiddleware, async (req, res, next) => {
  try {
    const customFields = await storage.getCustomFields(req.query.dataset as string);
    res.json({ success: true, data: customFields });
  } catch (error) {
    next(error);
  }
});

// Products
router.post("/product/create", authenticateMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const product = await storage.createProduct({
      ...req.body,
      createdBy: req.user!.id,
    });
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

router.get("/product", authenticateMiddleware, async (req, res, next) => {
  try {
    const filter: any = {};
    
    if (req.query.active === "all") {
      filter.active = "all";
    } else if (req.query.active === "false") {
      filter.active = false;
    } else {
      filter.active = true;
    }
    
    if (req.query.name) filter.name = req.query.name as string;

    let products = await storage.getProducts(filter);

    // Add asset counts if requested
    if (req.query.includeActiveAssetCount === "true" || req.query.includeDecommissionedAssetCount === "true") {
      products = await Promise.all(products.map(async (product) => {
        const counts = await storage.getProductAssetCounts(product.id);
        return {
          ...product,
          activeAssetCount: req.query.includeActiveAssetCount === "true" ? counts.active : undefined,
          decommissionedAssetCount: req.query.includeDecommissionedAssetCount === "true" ? counts.decommissioned : undefined,
        };
      }));
    }

    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
});

router.get("/product/:id", authenticateMiddleware, async (req, res, next) => {
  try {
    const product = await storage.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const counts = await storage.getProductAssetCounts(product.id);
    res.json({ 
      success: true, 
      data: { 
        ...product, 
        activeAssetCount: counts.active, 
        decommissionedAssetCount: counts.decommissioned 
      } 
    });
  } catch (error) {
    next(error);
  }
});

router.put("/product/:id", authenticateMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const product = await storage.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const allowedKeys = ["name", "description", "customAttributes", "active", "weight"];
    const updateData: any = { updatedBy: req.user!.id };
    
    Object.keys(req.body).forEach(key => {
      if (allowedKeys.includes(key)) {
        updateData[key] = req.body[key];
      }
    });

    const updatedProduct = await storage.updateProduct(req.params.id, updateData);
    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    next(error);
  }
});

// Product import
router.post("/product/:id/import", authenticateMiddleware, upload.single("file"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const product = await storage.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const fileContent = await fs.readFile(req.file.path, "utf-8");
    const records: any[] = [];
    
    await new Promise((resolve, reject) => {
      parse(fileContent, { columns: true, trim: true }, (err, data) => {
        if (err) reject(err);
        else {
          records.push(...data);
          resolve(data);
        }
      });
    });

    let successCount = 0;
    let errorCount = 0;
    const results: any[] = [];

    for (const row of records) {
      try {
        const customAttributes: Record<string, any> = {};
        Object.keys(row).forEach(key => {
          if (key.startsWith("customAttributes.")) {
            customAttributes[key.replace("customAttributes.", "")] = row[key];
            delete row[key];
          }
        });
        row.customAttributes = customAttributes;

        const tag = await storage.createTag({
          id: row.id || row.epc,
          ...row,
          createdBy: req.user!.id,
        });

        const asset = await storage.createAsset({
          productId: product.id,
          tagId: tag.id,
          createdBy: req.user!.id,
        });

        await storage.createAssetEvent({
          assetId: asset.id,
          state: "RETURNED",
          process: "COMMISSIONING",
          createdBy: req.user!.id,
        });

        results.push({ status: "fulfilled", value: { tag, asset } });
        successCount++;
      } catch (error: any) {
        results.push({ status: "rejected", reason: error.message });
        errorCount++;
      }
    }

    await fs.unlink(req.file.path);

    res.json({
      success: true,
      message: "File processed successfully",
      data: { successCount, errorCount, promiseResults: results },
    });
  } catch (error) {
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    next(error);
  }
});

// Tags
router.post("/tag/create", authenticateMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const tag = await storage.createTag({
      ...req.body,
      createdBy: req.user!.id,
    });
    res.json({ success: true, data: tag });
  } catch (error) {
    next(error);
  }
});

router.post("/tag/create-bulk", authenticateMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!Array.isArray(req.body)) {
      return res.status(400).json({ success: false, message: "Request body must be an array" });
    }

    const tagsToCreate = req.body.map(tag => ({
      ...tag,
      createdBy: req.user!.id,
    }));

    const tags = await storage.createTagsBulk(tagsToCreate);
    res.json({ success: true, data: tags });
  } catch (error) {
    next(error);
  }
});

router.post("/tag/import", authenticateMiddleware, upload.single("file"), async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const fileContent = await fs.readFile(req.file.path, "utf-8");
    const records: any[] = [];
    
    await new Promise((resolve, reject) => {
      parse(fileContent, { columns: true, trim: true }, (err, data) => {
        if (err) reject(err);
        else {
          records.push(...data);
          resolve(data);
        }
      });
    });

    let successCount = 0;
    let errorCount = 0;
    const results: any[] = [];

    for (const row of records) {
      try {
        const customAttributes: Record<string, any> = {};
        Object.keys(row).forEach(key => {
          if (key.startsWith("customAttributes.")) {
            customAttributes[key.replace("customAttributes.", "")] = row[key];
            delete row[key];
          }
        });
        row.customAttributes = customAttributes;

        const tag = await storage.createTag({
          id: row.id || row.epc,
          ...row,
          createdBy: req.user!.id,
        });

        results.push({ status: "fulfilled", value: { tag } });
        successCount++;
      } catch (error: any) {
        results.push({ status: "rejected", reason: error.message });
        errorCount++;
      }
    }

    await fs.unlink(req.file.path);

    res.json({
      success: true,
      message: "File processed successfully",
      data: { successCount, errorCount, promiseResults: results },
    });
  } catch (error) {
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    next(error);
  }
});

router.get("/tag", authenticateMiddleware, async (req, res, next) => {
  try {
    const filter: any = {};
    if (req.query.epc) filter.epc = req.query.epc as string;
    if (req.query.serial) filter.serial = req.query.serial as string;

    const pagination = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const result = await storage.getTags(filter, pagination);
    const paginationResult = getPagination(pagination);

    res.json({ success: true, data: result.data, pagination: paginationResult, count: result.count });
  } catch (error) {
    next(error);
  }
});

router.get("/tag/:id", authenticateMiddleware, async (req, res, next) => {
  try {
    const tag = await storage.getTagById(req.params.id);
    if (!tag) {
      return res.status(404).json({ success: false, message: "Tag not found" });
    }
    res.json({ success: true, data: tag });
  } catch (error) {
    next(error);
  }
});

router.put("/tag/:id", authenticateMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const tag = await storage.getTagById(req.params.id);
    if (!tag) {
      return res.status(404).json({ success: false, message: "Tag not found" });
    }

    const allowedKeys = ["serial", "type", "model", "provider", "brand", "customAttributes"];
    const updateData: any = { updatedBy: req.user!.id };
    
    Object.keys(req.body).forEach(key => {
      if (allowedKeys.includes(key)) {
        updateData[key] = req.body[key];
      }
    });

    const updatedTag = await storage.updateTag(req.params.id, updateData);
    res.json({ success: true, data: updatedTag });
  } catch (error) {
    next(error);
  }
});

// Assets
router.get("/asset", authenticateMiddleware, async (req, res, next) => {
  try {
    const filter: any = {};
    if (req.query.productId) filter.productId = req.query.productId as string;
    if (req.query.active === "all") filter.active = "all";
    else if (req.query.active === "false") filter.active = false;
    else filter.active = true;

    const pagination = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const result = await storage.getAssets(filter, pagination);
    const paginationResult = getPagination(pagination);

    res.json({ success: true, data: result.data, pagination: paginationResult, count: result.count });
  } catch (error) {
    next(error);
  }
});

router.get("/asset/:id", authenticateMiddleware, async (req, res, next) => {
  try {
    const asset = await storage.getAssetById(req.params.id);
    if (!asset) {
      return res.status(404).json({ success: false, message: "Asset not found" });
    }

    const history = await storage.getAssetEvents(asset.id, 5);
    res.json({ success: true, data: { ...asset, history } });
  } catch (error) {
    next(error);
  }
});

router.put("/asset/:id", authenticateMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const asset = await storage.getAssetById(req.params.id);
    if (!asset) {
      return res.status(404).json({ success: false, message: "Asset not found" });
    }

    const allowedKeys = ["active", "lastState"];
    const updateData: any = { updatedBy: req.user!.id };
    
    Object.keys(req.body).forEach(key => {
      if (allowedKeys.includes(key)) {
        updateData[key] = req.body[key];
      }
    });

    const updatedAsset = await storage.updateAsset(req.params.id, updateData);

    // Update tag state based on asset active status
    if (req.body.active !== undefined) {
      await storage.updateTag(asset.tagId, {
        state: req.body.active ? "AVAILABLE" : "DECOMMISSIONED",
      });
    }

    res.json({ success: true, data: updatedAsset });
  } catch (error) {
    next(error);
  }
});

// Asset inspection
router.post("/asset/inspect", authenticateMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!Array.isArray(req.body.inspection)) {
      return res.status(400).json({ success: false, message: "Invalid request body" });
    }

    const results: any[] = [];
    
    for (const item of req.body.inspection) {
      try {
        const asset = await storage.getAssetByTag(item.tagId, true);
        if (!asset) {
          results.push({ status: "rejected", tagId: item.tagId, reason: "Asset not found" });
          continue;
        }

        const newState = item.passed ? "CLEANED" : (item.state || "DAMAGED");
        
        await storage.updateAsset(asset.id, {
          lastState: newState,
          updatedBy: req.user!.id,
        });

        await storage.createAssetEvent({
          assetId: asset.id,
          state: newState,
          process: "INSPECTION",
          comment: item.comment,
          createdBy: req.user!.id,
        });

        results.push({ status: "fulfilled", tagId: item.tagId, newState });
      } catch (error: any) {
        results.push({ status: "rejected", tagId: item.tagId, reason: error.message });
      }
    }

    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

export default router;
