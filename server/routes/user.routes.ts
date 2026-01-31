import { Router } from "express";
import bcrypt from "bcrypt";
import { storage } from "../storage";
import { authenticateMiddleware, generateToken, AuthenticatedRequest } from "../middleware/auth";
import { ROLE_PERMISSIONS, SYSTEM_RESERVED_ID } from "@shared/schema";

const router = Router();

// Login
router.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Username and password are required" });
    }

    const contact = await storage.getContactByUsername(username.toLowerCase());
    if (!contact) {
      return res.status(401).json({ success: false, message: "Invalid username or password" });
    }

    if (!contact.systemUserActive) {
      return res.status(401).json({ success: false, message: "User inactive" });
    }

    if (!contact.systemUserPasswordHash) {
      return res.status(401).json({ success: false, message: "Invalid username or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, contact.systemUserPasswordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Invalid username or password" });
    }

    const role = await storage.getRoleById(contact.type);
    const token = generateToken({ id: contact.id, username: contact.systemUserUsername || "" });

    await storage.updateContact(contact.id, { systemUserLastLogin: new Date() });

    const contactData = {
      ...contact,
      systemUserPasswordHash: undefined,
      type: role,
    };

    res.json({
      success: true,
      data: {
        message: "Login successful",
        token,
        contact: contactData,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get("/me", authenticateMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const contact = await storage.getContactById(req.user!.id);
    if (!contact) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const role = await storage.getRoleById(contact.type);
    res.json({ 
      success: true, 
      contact: { 
        ...contact, 
        systemUserPasswordHash: undefined,
        type: role 
      } 
    });
  } catch (error) {
    next(error);
  }
});

// Create role
router.post("/role/create", authenticateMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const role = await storage.createRole({
      ...req.body,
      createdBy: req.user!.id,
    });
    res.json({ success: true, data: role });
  } catch (error) {
    next(error);
  }
});

// Get roles
router.get("/role", authenticateMiddleware, async (req, res, next) => {
  try {
    const roles = await storage.getRoles({ name: req.query.name as string });
    res.json({ success: true, data: roles });
  } catch (error) {
    next(error);
  }
});

// Get available permissions
router.get("/role/permissions", authenticateMiddleware, async (req, res, next) => {
  try {
    res.json({ success: true, data: ROLE_PERMISSIONS });
  } catch (error) {
    next(error);
  }
});

// Update role
router.put("/role/:id", authenticateMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const role = await storage.getRoleById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }
    if (role.id === "ADMIN") {
      return res.status(400).json({ success: false, message: "Cannot update ADMIN role" });
    }

    const allowedKeys = ["permissions"];
    const updateData: any = { updatedBy: req.user!.id };
    
    if (req.body.permissions) {
      const newPermissions = { ...role.permissions };
      Object.keys(req.body.permissions).forEach(key => {
        if (ROLE_PERMISSIONS.includes(key as any)) {
          newPermissions[key] = req.body.permissions[key];
        }
      });
      updateData.permissions = newPermissions;
    }

    const updatedRole = await storage.updateRole(req.params.id, updateData);
    res.json({ success: true, data: updatedRole });
  } catch (error) {
    next(error);
  }
});

// Create system user for a contact
router.post("/create-system-user/:contactId", authenticateMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { contactId } = req.params;
    const { username, password } = req.body;

    if (contactId === SYSTEM_RESERVED_ID) {
      return res.status(400).json({ success: false, message: "Not allowed" });
    }

    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Username and password are required" });
    }

    const contact = await storage.getContactById(contactId);
    if (!contact) {
      return res.status(400).json({ success: false, message: "Invalid contact ID" });
    }

    if (contact.systemUserUsername) {
      return res.status(400).json({ success: false, message: "Contact already has a user account" });
    }

    const existingUser = await storage.getContactByUsername(username.toLowerCase());
    if (existingUser) {
      return res.status(409).json({ success: false, message: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await storage.updateContact(contactId, {
      systemUserActive: true,
      systemUserUsername: username.toLowerCase(),
      systemUserPasswordHash: hashedPassword,
      systemUserPasswordLastChanged: new Date(),
      systemUserCreatedBy: req.user!.id,
    });

    res.status(201).json({ success: true, message: "System user created" });
  } catch (error) {
    next(error);
  }
});

// Update system user
router.put("/update-system-user/:contactId", authenticateMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { contactId } = req.params;

    if (contactId === SYSTEM_RESERVED_ID) {
      return res.status(400).json({ success: false, message: "Not allowed" });
    }

    const contact = await storage.getContactById(contactId);
    if (!contact) {
      return res.status(400).json({ success: false, message: "Invalid contact ID" });
    }

    if (!contact.systemUserUsername) {
      return res.status(400).json({ success: false, message: "Contact is not a system user" });
    }

    const updateData: any = { systemUserUpdatedBy: req.user!.id };
    const permissions = req.user!.permissions;
    const allowedFields = ["password"];
    
    if (permissions.admin || permissions.UserManagement) {
      allowedFields.push("active", "username");
    }

    if (req.body.username && allowedFields.includes("username")) {
      if (req.body.username !== contact.systemUserUsername) {
        const existingUser = await storage.getContactByUsername(req.body.username.toLowerCase());
        if (existingUser && existingUser.id !== contactId) {
          return res.status(400).json({ success: false, message: "Username already exists" });
        }
        updateData.systemUserUsername = req.body.username.toLowerCase();
      }
    }

    if (req.body.password && allowedFields.includes("password")) {
      updateData.systemUserPasswordHash = await bcrypt.hash(req.body.password, 10);
      updateData.systemUserPasswordLastChanged = new Date();
    }

    if (req.body.active !== undefined && allowedFields.includes("active")) {
      updateData.systemUserActive = req.body.active;
    }

    const updatedContact = await storage.updateContact(contactId, updateData);
    const role = await storage.getRoleById(updatedContact!.type);

    res.json({ 
      success: true, 
      data: { 
        ...updatedContact, 
        systemUserPasswordHash: undefined,
        type: role 
      } 
    });
  } catch (error) {
    next(error);
  }
});

export default router;
