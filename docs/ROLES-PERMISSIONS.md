# Roles & Permissions

## Overview

The CleanTech system uses role-based access control (RBAC) to manage what actions different users can perform. Users are assigned roles through their Contact record, and each role has a set of permissions.

---

## User Types

### Internal Users (Company Staff)

| Role | Description | Typical Responsibilities |
|------|-------------|-------------------------|
| **ADMIN** | System administrator | Full system access, all operations |
| **OWNER** | Company owner | Full system access, all operations |
| **MANAGER** | Operations manager | Full system access, all operations |
| **OFFICE-ADMIN** | Office administrator | Full system access, all operations |
| **EMPLOYEE** | General employee | Base role, limited access |

### External Users (Partners)

| Role | Description | Typical Responsibilities |
|------|-------------|-------------------------|
| **CUSTOMER** | Farmers | View/create own orders |
| **PROCESSOR** | Processing facilities | View/create own orders |
| **CARRIER** | Transport companies | Transport operations (no system access) |

---

## Roles Detail

### ADMIN / OWNER / MANAGER / OFFICE-ADMIN

```json
{
  "admin": true
}
```

These roles have `admin: true` which **bypasses all permission checks**. They can:
- View and manage all orders
- Create orders for any customer
- Approve, cancel, and revoke orders
- Create shipments
- Manage products, contacts, and assets
- Access analytics and reports
- Configure system settings

### EMPLOYEE

```json
{
  "admin": false,
  "Shipping": false,
  "Analytics": false,
  "OrderViewAll": false,
  "OrderViewSelf": false,
  "OrderCreateAll": false,
  "OrderCreateSelf": false,
  "OrderManagement": false,
  "AssetManagement": false,
  "AssetCommissioning": false,
  "ProductsManagement": false,
  "UserManagement": false,
  "HierarchyManagement": false
}
```

Base role with no default permissions. Permissions must be explicitly granted.

### CUSTOMER

```json
{
  "admin": false,
  "OrderViewSelf": true,
  "OrderCreateSelf": true
}
```

Farmers can:
- View their own orders
- Create new orders for themselves
- View shipments related to their orders

Cannot:
- View other customers' orders
- Approve or manage orders
- Create shipments
- Access admin functions

### PROCESSOR

```json
{
  "admin": false,
  "OrderViewSelf": true,
  "OrderCreateSelf": true
}
```

Processing facilities can:
- View their own orders (INBOUND)
- Create return orders
- View shipments related to their orders

Cannot:
- View other parties' orders
- Approve or manage orders
- Create shipments
- Access admin functions

### CARRIER

```json
{
  "admin": false
}
```

Transport companies have **no system permissions**. Their role is for:
- Identification in the system
- Assignment to shipments
- Contact information storage

---

## Available Permissions

| Permission | Description | Used By |
|------------|-------------|---------|
| `admin` | Full administrative access (bypasses all checks) | Admin roles |
| `Analytics` | View analytics/dashboard | Managers |
| `OrderViewAll` | View all orders in the system | Office staff |
| `OrderViewSelf` | View only own orders | Customers, Processors |
| `OrderCreateAll` | Create orders for any customer | Office staff |
| `OrderCreateSelf` | Create orders for self only | Customers, Processors |
| `OrderManagement` | Approve, cancel, revoke orders; create shipments | Managers |
| `Shipping` | Shipping operations | Warehouse staff |
| `AssetManagement` | Manage assets | Warehouse staff |
| `AssetCommissioning` | Register new assets | Warehouse staff |
| `ProductsManagement` | Manage product catalog | Admin |
| `UserManagement` | Manage users and roles | Admin |
| `HierarchyManagement` | Manage organizational hierarchy | Admin |

---

## Permission Matrix

### Order Operations

| Operation | ADMIN | MANAGER | CUSTOMER | PROCESSOR | CARRIER |
|-----------|-------|---------|----------|-----------|---------|
| View All Orders | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Own Orders | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create Any Order | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create Own Order | ✅ | ✅ | ✅ | ✅ | ❌ |
| Approve Order | ✅ | ✅ | ❌ | ❌ | ❌ |
| Cancel Order | ✅ | ✅ | ❌ | ❌ | ❌ |
| Revoke Approval | ✅ | ✅ | ❌ | ❌ | ❌ |

### Shipment Operations

| Operation | ADMIN | MANAGER | CUSTOMER | PROCESSOR | CARRIER |
|-----------|-------|---------|----------|-----------|---------|
| View All Shipments | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Own Shipments | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create Shipment | ✅ | ✅ | ❌ | ❌ | ❌ |

### Asset Operations

| Operation | ADMIN | MANAGER | CUSTOMER | PROCESSOR | CARRIER |
|-----------|-------|---------|----------|-----------|---------|
| View Assets | ✅ | ✅ | ❌ | ❌ | ❌ |
| Commission Assets | ✅ | ✅ | ❌ | ❌ | ❌ |
| Inspect Assets | ✅ | ✅ | ❌ | ❌ | ❌ |

### Setup Operations

| Operation | ADMIN | MANAGER | CUSTOMER | PROCESSOR | CARRIER |
|-----------|-------|---------|----------|-----------|---------|
| Manage Products | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage Contacts | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage Tags | ✅ | ✅ | ❌ | ❌ | ❌ |
| System Settings | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## Authentication Flow

1. User logs in with username/password
2. System validates credentials against Contact record
3. JWT token issued containing user ID and role
4. Frontend routes protected based on required permissions
5. Backend middleware validates JWT on each request

---

## Creating System Users

Contacts can be converted to system users with login capabilities:

1. Contact must have a `roleId` assigned
2. Set username and password via `/api/user/create-system-user/:contactId`
3. User can then login and access features based on their role's permissions

---

## Security Notes

1. **Admin bypass**: Roles with `admin: true` bypass all permission checks
2. **Frontend protection**: Routes are protected based on permissions
3. **Backend enforcement**: API endpoints should verify permissions (currently minimal)
4. **Password storage**: Passwords are hashed using bcrypt
5. **JWT tokens**: Used for stateless authentication
