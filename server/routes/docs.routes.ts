import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";

const router = Router();

const docsDir = path.join(process.cwd(), "docs");

const docFiles = [
  { id: "readme", name: "Overview", file: "README.md" },
  { id: "data-model", name: "Data Model", file: "DATA-MODEL.md" },
  { id: "order-lifecycle", name: "Order Lifecycle", file: "ORDER-LIFECYCLE.md" },
  { id: "asset-lifecycle", name: "Asset Lifecycle", file: "ASSET-LIFECYCLE.md" },
  { id: "roles-permissions", name: "Roles & Permissions", file: "ROLES-PERMISSIONS.md" },
  { id: "processes", name: "Processes", file: "PROCESSES.md" },
];

router.get("/", (req: Request, res: Response) => {
  res.json(docFiles.map(({ id, name }) => ({ id, name })));
});

router.get("/:id", (req: Request, res: Response) => {
  const docFile = docFiles.find((d) => d.id === req.params.id);
  if (!docFile) {
    return res.status(404).json({ message: "Documentation not found" });
  }

  const filePath = path.join(docsDir, docFile.file);
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    res.json({ id: docFile.id, name: docFile.name, content });
  } catch (error) {
    res.status(500).json({ message: "Error reading documentation file" });
  }
});

export default router;
