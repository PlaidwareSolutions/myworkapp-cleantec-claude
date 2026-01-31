import swaggerUi from "swagger-ui-express";
import { Express } from "express";

const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "CleanTech Asset Tracking API",
    version: "1.0.0",
    description: "Comprehensive API for managing asset tracking, orders, BOLs, and shipments in the CleanTech ecosystem.",
    contact: {
      name: "CleanTech Support",
      email: "support@cleantech.com",
    },
  },
  servers: [
    {
      url: "/api",
      description: "API Server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT token obtained from /api/user/login",
      },
    },
    schemas: {
      LoginRequest: {
        type: "object",
        required: ["username", "password"],
        properties: {
          username: { type: "string", example: "admin" },
          password: { type: "string", example: "password123" },
        },
      },
      LoginResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          data: {
            type: "object",
            properties: {
              message: { type: "string" },
              token: { type: "string" },
              contact: { $ref: "#/components/schemas/Contact" },
            },
          },
        },
      },
      Contact: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          type: { type: "string" },
          active: { type: "boolean" },
          name: { type: "string" },
          phone: { type: "array", items: { type: "string" } },
          email: { type: "array", items: { type: "string" } },
          notification: { type: "boolean" },
          addressStreet: { type: "string" },
          addressCity: { type: "string" },
          addressState: { type: "string" },
          addressZipCode: { type: "string" },
          addressCountry: { type: "string" },
        },
      },
      Role: {
        type: "object",
        properties: {
          id: { type: "string" },
          permissions: {
            type: "object",
            additionalProperties: { type: "boolean" },
          },
        },
      },
      Product: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          description: { type: "string" },
          weight: { type: "number" },
          active: { type: "boolean" },
          customAttributes: { type: "object" },
        },
      },
      Tag: {
        type: "object",
        properties: {
          id: { type: "string", description: "EPC code" },
          serial: { type: "string" },
          type: { type: "string" },
          model: { type: "string" },
          provider: { type: "string" },
          brand: { type: "string" },
          state: { type: "string", enum: ["COMMISSIONED", "AVAILABLE", "DECOMMISSIONED"] },
        },
      },
      Asset: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          productId: { type: "string", format: "uuid" },
          tagId: { type: "string" },
          active: { type: "boolean" },
          lastState: { type: "string", enum: ["CLEANED", "ASSIGNED", "PROCESSING", "RETURNED", "DAMAGED", "FIXED", "DECOMMISSIONED"] },
        },
      },
      Order: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          referenceId: { type: "string" },
          poNumber: { type: "string" },
          palletCount: { type: "integer" },
          orderWeight: { type: "number" },
          carrierId: { type: "string", format: "uuid" },
          customerId: { type: "string", format: "uuid" },
          type: { type: "string", enum: ["OUTBOUND", "INBOUND"] },
          status: { type: "string", enum: ["INITIATED", "APPROVED", "SHIPPED-PARTIAL", "SHIPPED", "RECEIVED", "RETURNED", "RETURNED-PARTIAL", "CANCELLED", "MANUAL RECONCILIATION"] },
          requiredDate: { type: "string", format: "date-time" },
          shipDate: { type: "string", format: "date-time" },
        },
      },
      OrderCreate: {
        type: "object",
        required: ["customer", "items"],
        properties: {
          customer: { type: "string", format: "uuid", description: "Customer contact ID" },
          carrier: { type: "string", format: "uuid", description: "Carrier contact ID" },
          poNumber: { type: "string" },
          requiredDate: { type: "string", format: "date-time" },
          shipDate: { type: "string", format: "date-time" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                product: { type: "string", format: "uuid" },
                requiredQuantity: { type: "integer" },
              },
            },
          },
          receiverAddress: {
            type: "object",
            properties: {
              name: { type: "string" },
              address: {
                type: "object",
                properties: {
                  street: { type: "string" },
                  city: { type: "string" },
                  state: { type: "string" },
                  zipCode: { type: "string" },
                  country: { type: "string" },
                },
              },
            },
          },
        },
      },
      Bol: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          referenceId: { type: "string" },
          carrierId: { type: "string", format: "uuid" },
          orderId: { type: "string", format: "uuid" },
          orderType: { type: "string", enum: ["OUTBOUND", "INBOUND"] },
        },
      },
      Shipment: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          referenceId: { type: "string" },
          carrierId: { type: "string", format: "uuid" },
          orderType: { type: "string", enum: ["OUTBOUND", "INBOUND"] },
          shipmentDate: { type: "string", format: "date-time" },
          receivedDate: { type: "string", format: "date-time" },
          driverName: { type: "string" },
          driverDl: { type: "string" },
        },
      },
      ShipmentCreate: {
        type: "object",
        required: ["carrier", "bols"],
        properties: {
          carrier: { type: "string", format: "uuid" },
          shipmentDate: { type: "string", format: "date-time" },
          driver: {
            type: "object",
            properties: {
              name: { type: "string" },
              dl: { type: "string" },
            },
          },
          bols: {
            type: "array",
            items: {
              type: "object",
              properties: {
                order: { type: "string", format: "uuid" },
                tags: { type: "array", items: { type: "string" } },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      product: { type: "string", format: "uuid" },
                      quantity: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      Settings: {
        type: "object",
        properties: {
          binsPerPallet: { type: "integer" },
          palletWeight: { type: "number" },
          binWeight: { type: "number" },
          warehouses: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                address: { type: "object" },
              },
            },
          },
          emailSettings: { type: "object" },
        },
      },
      Error: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string" },
        },
      },
      Pagination: {
        type: "object",
        properties: {
          page: { type: "integer" },
          limit: { type: "integer" },
          skip: { type: "integer" },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/user/login": {
      post: {
        tags: ["Authentication"],
        summary: "User login",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } },
          },
        },
        responses: {
          "200": {
            description: "Login successful",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/LoginResponse" } },
            },
          },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/user/me": {
      get: {
        tags: ["Authentication"],
        summary: "Get current user",
        responses: {
          "200": { description: "Current user data" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/user/role": {
      get: {
        tags: ["Roles"],
        summary: "List all roles",
        responses: { "200": { description: "List of roles" } },
      },
    },
    "/user/role/create": {
      post: {
        tags: ["Roles"],
        summary: "Create a new role",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["id"],
                properties: {
                  id: { type: "string" },
                  permissions: { type: "object" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Role created" } },
      },
    },
    "/user/role/permissions": {
      get: {
        tags: ["Roles"],
        summary: "Get available permissions",
        responses: { "200": { description: "List of available permissions" } },
      },
    },
    "/user/role/{id}": {
      put: {
        tags: ["Roles"],
        summary: "Update role permissions",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: { type: "object", properties: { permissions: { type: "object" } } },
            },
          },
        },
        responses: { "200": { description: "Role updated" } },
      },
    },
    "/user/create-system-user/{contactId}": {
      post: {
        tags: ["System Users"],
        summary: "Create system user for a contact",
        parameters: [{ name: "contactId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username", "password"],
                properties: {
                  username: { type: "string" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "201": { description: "System user created" } },
      },
    },
    "/user/update-system-user/{contactId}": {
      put: {
        tags: ["System Users"],
        summary: "Update system user",
        parameters: [{ name: "contactId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  username: { type: "string" },
                  password: { type: "string" },
                  active: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "System user updated" } },
      },
    },
    "/contact/create": {
      post: {
        tags: ["Contacts"],
        summary: "Create a new contact",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Contact" },
            },
          },
        },
        responses: { "200": { description: "Contact created" } },
      },
    },
    "/contact": {
      get: {
        tags: ["Contacts"],
        summary: "List contacts",
        parameters: [
          { name: "name", in: "query", schema: { type: "string" } },
          { name: "type", in: "query", schema: { type: "string" } },
          { name: "active", in: "query", schema: { type: "string", enum: ["true", "false", "all"] } },
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
        ],
        responses: { "200": { description: "List of contacts with pagination" } },
      },
    },
    "/contact/{id}": {
      get: {
        tags: ["Contacts"],
        summary: "Get contact by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Contact data" } },
      },
      put: {
        tags: ["Contacts"],
        summary: "Update contact",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/Contact" } },
          },
        },
        responses: { "200": { description: "Contact updated" } },
      },
    },
    "/entity/product/create": {
      post: {
        tags: ["Products"],
        summary: "Create a new product",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/Product" } },
          },
        },
        responses: { "200": { description: "Product created" } },
      },
    },
    "/entity/product": {
      get: {
        tags: ["Products"],
        summary: "List products",
        parameters: [
          { name: "name", in: "query", schema: { type: "string" } },
          { name: "active", in: "query", schema: { type: "string" } },
          { name: "includeActiveAssetCount", in: "query", schema: { type: "boolean" } },
          { name: "includeDecommissionedAssetCount", in: "query", schema: { type: "boolean" } },
        ],
        responses: { "200": { description: "List of products" } },
      },
    },
    "/entity/product/{id}": {
      get: {
        tags: ["Products"],
        summary: "Get product by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Product data with asset counts" } },
      },
      put: {
        tags: ["Products"],
        summary: "Update product",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Product updated" } },
      },
    },
    "/entity/product/{id}/import": {
      post: {
        tags: ["Products"],
        summary: "Import tags/assets from CSV for a product",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: { file: { type: "string", format: "binary" } },
              },
            },
          },
        },
        responses: { "200": { description: "Import results" } },
      },
    },
    "/entity/tag/create": {
      post: {
        tags: ["Tags"],
        summary: "Create a new tag",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/Tag" } },
          },
        },
        responses: { "200": { description: "Tag created" } },
      },
    },
    "/entity/tag/create-bulk": {
      post: {
        tags: ["Tags"],
        summary: "Create multiple tags",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "array", items: { $ref: "#/components/schemas/Tag" } },
            },
          },
        },
        responses: { "200": { description: "Tags created" } },
      },
    },
    "/entity/tag/import": {
      post: {
        tags: ["Tags"],
        summary: "Import tags from CSV",
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: { file: { type: "string", format: "binary" } },
              },
            },
          },
        },
        responses: { "200": { description: "Import results" } },
      },
    },
    "/entity/tag": {
      get: {
        tags: ["Tags"],
        summary: "List tags",
        parameters: [
          { name: "epc", in: "query", schema: { type: "string" } },
          { name: "serial", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
        ],
        responses: { "200": { description: "List of tags with pagination" } },
      },
    },
    "/entity/tag/{id}": {
      get: {
        tags: ["Tags"],
        summary: "Get tag by ID (EPC)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Tag data" } },
      },
      put: {
        tags: ["Tags"],
        summary: "Update tag",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Tag updated" } },
      },
    },
    "/entity/asset": {
      get: {
        tags: ["Assets"],
        summary: "List assets",
        parameters: [
          { name: "productId", in: "query", schema: { type: "string" } },
          { name: "active", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
        ],
        responses: { "200": { description: "List of assets with pagination" } },
      },
    },
    "/entity/asset/{id}": {
      get: {
        tags: ["Assets"],
        summary: "Get asset by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Asset data with history" } },
      },
      put: {
        tags: ["Assets"],
        summary: "Update asset",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Asset updated" } },
      },
    },
    "/entity/asset/inspect": {
      post: {
        tags: ["Assets"],
        summary: "Inspect assets and update their state",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  inspection: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        tagId: { type: "string" },
                        passed: { type: "boolean" },
                        state: { type: "string" },
                        comment: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Inspection results" } },
      },
    },
    "/entity/customfields/create": {
      post: {
        tags: ["Custom Fields"],
        summary: "Create custom field",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  dataset: { type: "string" },
                  fieldName: { type: "string" },
                  fieldType: { type: "string" },
                  options: { type: "array", items: { type: "string" } },
                  required: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Custom field created" } },
      },
    },
    "/entity/customfields": {
      get: {
        tags: ["Custom Fields"],
        summary: "List custom fields",
        parameters: [{ name: "dataset", in: "query", schema: { type: "string" } }],
        responses: { "200": { description: "List of custom fields" } },
      },
    },
    "/order/create": {
      post: {
        tags: ["Orders"],
        summary: "Create a new order",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/OrderCreate" } },
          },
        },
        responses: { "200": { description: "Order created" } },
      },
    },
    "/order": {
      get: {
        tags: ["Orders"],
        summary: "List orders",
        parameters: [
          { name: "carrier", in: "query", schema: { type: "string" } },
          { name: "customer", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "type", in: "query", schema: { type: "string" } },
          { name: "poNumber", in: "query", schema: { type: "string" } },
          { name: "referenceId", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
        ],
        responses: { "200": { description: "List of orders with pagination" } },
      },
    },
    "/order/{id}": {
      get: {
        tags: ["Orders"],
        summary: "Get order by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Order data with items and history" } },
      },
      put: {
        tags: ["Orders"],
        summary: "Update order",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Order updated" } },
      },
    },
    "/order/{id}/pdf": {
      get: {
        tags: ["Orders"],
        summary: "Download order PDF",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "PDF file",
            content: { "application/pdf": { schema: { type: "string", format: "binary" } } },
          },
        },
      },
    },
    "/order/{id}/approve": {
      post: {
        tags: ["Orders"],
        summary: "Approve an order",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Order approved" } },
      },
    },
    "/order/{id}/cancel": {
      post: {
        tags: ["Orders"],
        summary: "Cancel an order",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { reason: { type: "string" } },
              },
            },
          },
        },
        responses: { "200": { description: "Order cancelled" } },
      },
    },
    "/tracking/bol": {
      get: {
        tags: ["BOLs"],
        summary: "List BOLs",
        parameters: [
          { name: "carrier", in: "query", schema: { type: "string" } },
          { name: "bolNumber", in: "query", schema: { type: "string" } },
          { name: "orderPoNumber", in: "query", schema: { type: "string" } },
          { name: "customer", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
        ],
        responses: { "200": { description: "List of BOLs" } },
      },
    },
    "/tracking/bol/{id}": {
      get: {
        tags: ["BOLs"],
        summary: "Get BOL by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "BOL data with items and tags" } },
      },
      put: {
        tags: ["BOLs"],
        summary: "Update BOL tags",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "BOL updated" } },
      },
    },
    "/tracking/bol/{id}/pdf": {
      get: {
        tags: ["BOLs"],
        summary: "Download BOL PDF",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "PDF file",
            content: { "application/pdf": { schema: { type: "string", format: "binary" } } },
          },
        },
      },
    },
    "/tracking/shipment/create": {
      post: {
        tags: ["Shipments"],
        summary: "Create a new shipment",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ShipmentCreate" } },
          },
        },
        responses: { "200": { description: "Shipment created" } },
      },
    },
    "/tracking/shipment": {
      get: {
        tags: ["Shipments"],
        summary: "List shipments",
        parameters: [
          { name: "carrier", in: "query", schema: { type: "string" } },
          { name: "shipmentNumber", in: "query", schema: { type: "string" } },
          { name: "orderType", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
        ],
        responses: { "200": { description: "List of shipments" } },
      },
    },
    "/tracking/shipment/{id}": {
      get: {
        tags: ["Shipments"],
        summary: "Get shipment by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Shipment data with BOLs" } },
      },
      put: {
        tags: ["Shipments"],
        summary: "Update shipment",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Shipment updated" } },
      },
    },
    "/stats/activity/orders": {
      get: {
        tags: ["Statistics"],
        summary: "Get order activity events",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
        ],
        responses: { "200": { description: "Order activity events" } },
      },
    },
    "/stats/product/{productId}/tags": {
      get: {
        tags: ["Statistics"],
        summary: "Get product tag statistics",
        parameters: [{ name: "productId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Tag availability stats" } },
      },
    },
    "/stats/asset/status": {
      get: {
        tags: ["Statistics"],
        summary: "Get asset status breakdown",
        responses: { "200": { description: "Asset counts by status" } },
      },
    },
    "/stats/asset/customer": {
      get: {
        tags: ["Statistics"],
        summary: "Get assets by customer",
        responses: { "200": { description: "Asset distribution by customer" } },
      },
    },
    "/stats/asset/processor": {
      get: {
        tags: ["Statistics"],
        summary: "Get assets at processor",
        responses: { "200": { description: "Assets currently at processor" } },
      },
    },
    "/settings": {
      get: {
        tags: ["Settings"],
        summary: "Get application settings",
        responses: { "200": { description: "Settings data" } },
      },
      put: {
        tags: ["Settings"],
        summary: "Update settings",
        requestBody: {
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/Settings" } },
          },
        },
        responses: { "200": { description: "Settings updated" } },
      },
    },
    "/hierarchy": {
      get: {
        tags: ["Hierarchy"],
        summary: "Get full hierarchy tree",
        responses: { "200": { description: "Hierarchy with levels and tree structure" } },
      },
    },
    "/hierarchy/levels": {
      get: {
        tags: ["Hierarchy"],
        summary: "Get hierarchy levels",
        responses: { "200": { description: "List of hierarchy levels" } },
      },
      post: {
        tags: ["Hierarchy"],
        summary: "Create hierarchy level",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  level: { type: "integer" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Hierarchy level created" } },
      },
    },
    "/hierarchy/nodes": {
      get: {
        tags: ["Hierarchy"],
        summary: "Get hierarchy nodes",
        parameters: [
          { name: "levelId", in: "query", schema: { type: "string" } },
          { name: "parentId", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "List of hierarchy nodes" } },
      },
      post: {
        tags: ["Hierarchy"],
        summary: "Create hierarchy node",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  levelId: { type: "string" },
                  parentId: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Hierarchy node created" } },
      },
    },
  },
  tags: [
    { name: "Authentication", description: "User authentication and login" },
    { name: "Roles", description: "Role management" },
    { name: "System Users", description: "System user management" },
    { name: "Contacts", description: "Contact management (customers, carriers, processors)" },
    { name: "Products", description: "Product catalog management" },
    { name: "Tags", description: "RFID/EPC tag management" },
    { name: "Assets", description: "Asset tracking and inspection" },
    { name: "Custom Fields", description: "Custom field definitions" },
    { name: "Orders", description: "Order management and workflow" },
    { name: "BOLs", description: "Bill of Lading management" },
    { name: "Shipments", description: "Shipment management" },
    { name: "Statistics", description: "Analytics and statistics" },
    { name: "Settings", description: "Application settings" },
    { name: "Hierarchy", description: "Organizational hierarchy" },
  ],
};

export function setupSwagger(app: Express) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "CleanTech API Documentation",
  }));
}
