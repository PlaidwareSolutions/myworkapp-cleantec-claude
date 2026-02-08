import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { storage } from "../storage";
import { ROLE_PERMISSIONS } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "cleantech-api-secret-key";

export interface JWTPayload {
  id: string;
  username: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    contact: any;
    permissions: Record<string, boolean>;
  };
}

export async function authenticateMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    const contact = await storage.getContactById(decoded.id);
    if (!contact) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    if (!contact.systemUserActive) {
      return res.status(401).json({ success: false, message: "User inactive" });
    }

    const role = await storage.getRoleById(contact.type);
    const permissions = (role?.permissions as Record<string, boolean>) || {};

    req.user = {
      id: contact.id,
      username: contact.systemUserUsername || "",
      contact,
      permissions,
    };

    res.locals.user = {
      _id: contact.id,
      ...contact,
      type: { ...role, permissions },
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
    next(error);
  }
}

export function authorizeMiddleware(selfPermissions: string[], allPermissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const permissions = req.user.permissions;
    
    if (permissions.admin) {
      return next();
    }

    const hasAllPermission = allPermissions.some(p => permissions[p]);
    const hasSelfPermission = selfPermissions.some(p => permissions[p]);

    if (hasAllPermission || hasSelfPermission) {
      res.locals.permissionLevel = hasAllPermission ? "all" : "self";
      return next();
    }

    return res.status(403).json({ success: false, message: "Insufficient permissions" });
  };
}

export function loadAccessFiltersMiddleware(entities: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const permissions = req.user.permissions;
    const userId = req.user.id;

    res.locals.orderAccessFilter = [];

    if (permissions.admin || permissions.OrderViewAll || permissions.OrderManagement) {
      // No filter needed - can see all
    } else if (permissions.OrderViewSelf) {
      res.locals.orderAccessFilter = [
        { customerId: userId },
        { createdBy: userId },
      ];
    }

    next();
  };
}

export function generateToken(payload: { id: string; username: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "365d" });
}

export { JWT_SECRET };
