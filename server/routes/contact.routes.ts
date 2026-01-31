import { Router } from "express";
import { storage, getPagination } from "../storage";
import { authenticateMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { SYSTEM_RESERVED_ID } from "@shared/schema";

const router = Router();

// Create contact
router.post("/create", authenticateMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (req.body.systemUser) delete req.body.systemUser;
    
    const contact = await storage.createContact({
      ...req.body,
      createdBy: req.user!.id,
    });
    res.json({ success: true, data: contact });
  } catch (error) {
    next(error);
  }
});

// Get contacts
router.get("", authenticateMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const permissions = req.user!.permissions;
    const canViewOtherUsers = permissions.admin || permissions.UserManagement || permissions.OrderCreateAll;

    let filter: any = {};
    
    if (req.query.name) filter.name = req.query.name as string;
    if (req.query.type) filter.type = req.query.type as string;
    
    if (req.query.active === "all") {
      filter.active = "all";
    } else if (req.query.active === "false") {
      filter.active = false;
    } else {
      filter.active = true;
    }

    const pagination = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const result = await storage.getContacts(filter, pagination);
    
    // Add orders count if requested
    let data = result.data;
    if (req.query.includeOrdersCount === "true") {
      data = await Promise.all(data.map(async (contact) => {
        const ordersCount = await storage.getContactOrdersCount(contact.id);
        return { ...contact, ordersCount };
      }));
    }

    // Filter based on permissions
    if (!canViewOtherUsers) {
      data = data.filter(c => c.type === "CARRIER" || c.id === req.user!.id);
    }

    const paginationResult = getPagination(pagination);
    res.json({ 
      success: true, 
      data, 
      pagination: paginationResult, 
      count: result.count 
    });
  } catch (error) {
    next(error);
  }
});

// Get contact by ID
router.get("/:id", authenticateMiddleware, async (req, res, next) => {
  try {
    const contact = await storage.getContactById(req.params.id, true);
    if (!contact) {
      return res.status(404).json({ success: false, message: "Contact not found" });
    }

    const role = await storage.getRoleById(contact.type);

    res.json({ 
      success: true, 
      data: { 
        ...contact, 
        systemUserPasswordHash: undefined,
        type: role 
      } 
    });
  } catch (error) {
    next(error);
  }
});

// Update contact
router.put("/:id", authenticateMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const contact = await storage.getContactById(req.params.id);
    if (!contact) {
      return res.status(404).json({ success: false, message: "Contact not found" });
    }

    const allowedKeys = [
      "active", "type", "name", "addressStreet", "addressCity", "addressState",
      "addressZipCode", "addressCountry", "businessDetails", "phone", "email",
      "notification", "customAttributes"
    ];

    const updateData: any = { updatedBy: req.user!.id };
    
    Object.keys(req.body).forEach(key => {
      if (allowedKeys.includes(key)) {
        updateData[key] = req.body[key];
      }
    });

    // Handle address object if provided
    if (req.body.address) {
      updateData.addressStreet = req.body.address.street;
      updateData.addressCity = req.body.address.city;
      updateData.addressState = req.body.address.state;
      updateData.addressZipCode = req.body.address.zipCode;
      updateData.addressCountry = req.body.address.country;
    }

    const updatedContact = await storage.updateContact(req.params.id, updateData);
    res.json({ success: true, data: updatedContact });
  } catch (error) {
    next(error);
  }
});

export default router;
