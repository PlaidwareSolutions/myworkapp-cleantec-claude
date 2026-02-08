import { Router } from "express";
import bcrypt from "bcrypt";
import multer from "multer";
import { storage } from "../storage";
import { authenticateMiddleware, generateToken, AuthenticatedRequest } from "../middleware/auth";
import { ROLE_PERMISSIONS, SYSTEM_RESERVED_ID } from "@shared/schema";
import { importFromZip } from "../services/import";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

// Check if setup is needed (no admin users exist)
router.get("/setup-status", async (req, res, next) => {
  try {
    const hasAdminUsers = await storage.hasAdminSystemUsers();
    res.json({ success: true, data: { setupRequired: !hasAdminUsers } });
  } catch (error) {
    next(error);
  }
});

// Initial setup - create first admin user (only works when no admin users exist)
router.post("/setup", async (req, res, next) => {
  try {
    const { name, email, username, password } = req.body;

    // Check if admin users already exist
    const hasAdminUsers = await storage.hasAdminSystemUsers();
    if (hasAdminUsers) {
      return res.status(403).json({ 
        success: false, 
        message: "Setup already completed. Admin users exist." 
      });
    }

    // Validate required fields
    if (!name || !email || !username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Name, email, username, and password are required" 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: "Password must be at least 6 characters" 
      });
    }

    // Check if ADMIN role exists, create if not
    let adminRole = await storage.getRoleById("ADMIN");
    if (!adminRole) {
      adminRole = await storage.createRole({
        id: "ADMIN",
        permissions: {
          admin: true,
          UserManagement: true,
          OrderManagement: true,
          OrderCreateAll: true,
          OrderViewAll: true,
          AssetManagement: true,
          Analytics: true,
        },
        createdBy: SYSTEM_RESERVED_ID,
      });
    }

    // Check if username already exists
    const existingUser = await storage.getContactByUsername(username.toLowerCase());
    if (existingUser) {
      return res.status(409).json({ success: false, message: "Username already exists" });
    }

    // Create the admin contact with system user
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const contact = await storage.createContact({
      name,
      email: [email.toLowerCase()],
      phone: [],
      type: "ADMIN",
      systemUserActive: true,
      systemUserUsername: username.toLowerCase(),
      systemUserPasswordHash: hashedPassword,
      systemUserPasswordLastChanged: new Date(),
      systemUserCreatedBy: SYSTEM_RESERVED_ID,
    });

    // Generate token for immediate login
    const token = generateToken({ id: contact.id, username: contact.systemUserUsername || "" });

    res.status(201).json({
      success: true,
      message: "Setup completed successfully",
      data: {
        token,
        contact: {
          ...contact,
          systemUserPasswordHash: undefined,
          type: adminRole,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Import legacy data from zip file (only works when no data exists)
router.post("/setup/import", upload.single("file"), async (req, res, next) => {
  try {
    const hasAdminUsers = await storage.hasAdminSystemUsers();
    if (hasAdminUsers) {
      return res.status(403).json({ 
        success: false, 
        message: "Import not allowed. System already has data." 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: "No file uploaded" 
      });
    }

    const result = await importFromZip(req.file.buffer);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: { stats: result.stats },
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    next(error);
  }
});

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

    const systemUser = {
      active: contact.systemUserActive,
      username: contact.systemUserUsername,
      passwordLastChanged: contact.systemUserPasswordLastChanged,
      lastLogin: contact.systemUserLastLogin,
      createdBy: contact.systemUserCreatedBy,
      updatedBy: contact.systemUserUpdatedBy,
    };

    const contactData = {
      ...contact,
      systemUserPasswordHash: undefined,
      type: role,
      systemUser,
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
    const systemUser = {
      active: contact.systemUserActive,
      username: contact.systemUserUsername,
      passwordLastChanged: contact.systemUserPasswordLastChanged,
      lastLogin: contact.systemUserLastLogin,
      createdBy: contact.systemUserCreatedBy,
      updatedBy: contact.systemUserUpdatedBy,
    };
    res.json({ 
      success: true, 
      contact: { 
        ...contact, 
        systemUserPasswordHash: undefined,
        type: role,
        systemUser,
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

// Delete system user (admin only)
router.delete("/delete-system-user/:contactId", authenticateMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { contactId } = req.params;
    const permissions = req.user!.permissions;

    if (!permissions.admin && !permissions.UserManagement) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    if (contactId === SYSTEM_RESERVED_ID) {
      return res.status(400).json({ success: false, message: "Not allowed" });
    }

    if (contactId === req.user!.id) {
      return res.status(400).json({ success: false, message: "Cannot delete your own user account" });
    }

    const contact = await storage.getContactById(contactId);
    if (!contact) {
      return res.status(400).json({ success: false, message: "Invalid contact ID" });
    }

    if (!contact.systemUserUsername) {
      return res.status(400).json({ success: false, message: "Contact is not a system user" });
    }

    await storage.updateContact(contactId, {
      systemUserActive: false,
      systemUserUsername: null,
      systemUserPasswordHash: null,
      systemUserPasswordLastChanged: null,
      systemUserCreatedBy: null,
      systemUserUpdatedBy: req.user!.id,
      systemUserLastLogin: null,
    });

    res.json({ success: true, message: "System user deleted successfully" });
  } catch (error) {
    next(error);
  }
});

// Reset password for a user (admin only)
router.post("/reset-password/:contactId", authenticateMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { contactId } = req.params;
    const { newPassword } = req.body;
    const permissions = req.user!.permissions;

    if (!permissions.admin && !permissions.UserManagement) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    if (contactId === SYSTEM_RESERVED_ID) {
      return res.status(400).json({ success: false, message: "Not allowed" });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const contact = await storage.getContactById(contactId);
    if (!contact) {
      return res.status(400).json({ success: false, message: "Invalid contact ID" });
    }

    if (!contact.systemUserUsername) {
      return res.status(400).json({ success: false, message: "Contact is not a system user" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await storage.updateContact(contactId, {
      systemUserPasswordHash: hashedPassword,
      systemUserPasswordLastChanged: new Date(),
      systemUserUpdatedBy: req.user!.id,
    });

    res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    next(error);
  }
});

// Change own password (authenticated user)
router.post("/change-password", authenticateMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });
    }

    const contact = await storage.getContactById(userId);
    if (!contact || !contact.systemUserPasswordHash) {
      return res.status(400).json({ success: false, message: "User not found" });
    }

    if (!contact.systemUserActive) {
      return res.status(403).json({ success: false, message: "User account is inactive" });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, contact.systemUserPasswordHash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await storage.updateContact(userId, {
      systemUserPasswordHash: hashedPassword,
      systemUserPasswordLastChanged: new Date(),
      systemUserUpdatedBy: userId,
    });

    res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;
