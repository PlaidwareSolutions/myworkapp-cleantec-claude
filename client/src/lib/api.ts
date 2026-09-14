import { getStoredToken } from "@/contexts/AuthContext";

const API_BASE = "/api";

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  
  const headers: HeadersInit = {
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData)) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem("cleantech_token");
    localStorage.removeItem("cleantech_user");
    window.location.href = "/auth/login";
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || error.message || "Request failed");
  }

  if (response.headers.get("content-type")?.includes("application/pdf")) {
    return response.blob() as unknown as T;
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  
  post: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),
  
  put: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    }),
  
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: "DELETE" }),

  upload: <T>(endpoint: string, formData: FormData) =>
    request<T>(endpoint, {
      method: "POST",
      body: formData,
    }),
};

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    skip: number;
  };
  count: number;
}

export const authApi = {
  login: (username: string, password: string) =>
    api.post<ApiResponse<{ token: string; contact: unknown }>>("/user/login", { username, password }),
  
  me: () => api.get<{ success: boolean; contact: unknown }>("/user/me"),
};

export const contactsApi = {
  list: (params?: { page?: number; limit?: number; type?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.type) query.set("type", params.type);
    if (params?.search) query.set("search", params.search);
    return api.get<PaginatedResponse<unknown>>(`/contact?${query}`);
  },
  get: (id: string) => api.get<ApiResponse<unknown>>(`/contact/${id}`),
  create: (data: unknown) => api.post<ApiResponse<unknown>>("/contact/create", data),
  update: (id: string, data: unknown) => api.put<ApiResponse<unknown>>(`/contact/${id}`, data),
  createSystemUser: (contactId: string, data: unknown) => 
    api.post<ApiResponse<unknown>>(`/user/create-system-user/${contactId}`, data),
  updateSystemUser: (contactId: string, data: unknown) => 
    api.put<ApiResponse<unknown>>(`/user/update-system-user/${contactId}`, data),
};

export const rolesApi = {
  list: () => api.get<ApiResponse<unknown[]>>("/user/role"),
  create: (data: unknown) => api.post<ApiResponse<unknown>>("/user/role/create", data),
};

export const productsApi = {
  list: (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    return api.get<ApiResponse<unknown[]>>(`/entity/product?${query}`);
  },
  get: (id: string) => api.get<ApiResponse<unknown>>(`/entity/product/${id}`),
  create: (data: unknown) => api.post<ApiResponse<unknown>>("/entity/product/create", data),
  update: (id: string, data: unknown) => api.put<ApiResponse<unknown>>(`/entity/product/${id}`, data),
  importAssets: (id: string, formData: FormData) => 
    api.upload<ApiResponse<unknown>>(`/entity/product/${id}/import`, formData),
};

export const tagsApi = {
  list: (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    return api.get<PaginatedResponse<unknown>>(`/entity/tag?${query}`);
  },
  get: (id: string) => api.get<ApiResponse<unknown>>(`/entity/tag/${id}`),
  create: (data: unknown) => api.post<ApiResponse<unknown>>("/entity/tag/create", data),
  update: (id: string, data: unknown) => api.put<ApiResponse<unknown>>(`/entity/tag/${id}`, data),
  import: (formData: FormData) => api.upload<ApiResponse<unknown>>("/entity/tag/import", formData),
  search: (epc: string) => api.get<ApiResponse<unknown>>(`/entity/tag/search?epc=${epc}`),
};

export const assetsApi = {
  list: (params?: { page?: number; limit?: number; status?: string; customerId?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.status) query.set("status", params.status);
    if (params?.customerId) query.set("customerId", params.customerId);
    return api.get<PaginatedResponse<unknown>>(`/entity/asset?${query}`);
  },
  get: (id: string) => api.get<ApiResponse<unknown>>(`/entity/asset/${id}`),
  update: (id: string, data: unknown) => api.put<ApiResponse<unknown>>(`/entity/asset/${id}`, data),
  inspect: (data: unknown) => api.post<ApiResponse<unknown>>("/entity/asset/inspect", data),
};

export const ordersApi = {
  list: (params?: { page?: number; limit?: number; status?: string; customerId?: string; poNumber?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.status) query.set("status", params.status);
    if (params?.customerId) query.set("customerId", params.customerId);
    if (params?.poNumber) query.set("poNumber", params.poNumber);
    return api.get<PaginatedResponse<unknown>>(`/order?${query}`);
  },
  get: (id: string) => api.get<ApiResponse<unknown>>(`/order/${id}`),
  create: (data: unknown) => api.post<ApiResponse<unknown>>("/order/create", data),
  update: (id: string, data: unknown) => api.put<ApiResponse<unknown>>(`/order/${id}`, data),
  approve: (id: string) => api.post<ApiResponse<unknown>>(`/order/${id}/approve`),
  cancel: (id: string) => api.post<ApiResponse<unknown>>(`/order/${id}/cancel`),
  getPdf: (id: string) => api.get<Blob>(`/order/${id}/pdf`),
};

export const shipmentsApi = {
  list: (params?: { page?: number; limit?: number; bolNumber?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.bolNumber) query.set("bolNumber", params.bolNumber);
    return api.get<PaginatedResponse<unknown>>(`/tracking/shipment?${query}`);
  },
  get: (id: string) => api.get<ApiResponse<unknown>>(`/tracking/shipment/${id}`),
  create: (data: unknown) => api.post<ApiResponse<unknown>>("/tracking/shipment/create", data),
};

export const bolsApi = {
  list: (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    return api.get<PaginatedResponse<unknown>>(`/tracking/bol?${query}`);
  },
  get: (id: string) => api.get<ApiResponse<unknown>>(`/tracking/bol/${id}`),
  getPdf: (id: string) => api.get<Blob>(`/tracking/bol/${id}/pdf`),
};

export const statsApi = {
  orderActivity: () => api.get<ApiResponse<unknown>>("/stats/activity/orders"),
  assetStatus: () => api.get<ApiResponse<unknown>>("/stats/asset/status"),
  assetByCustomer: () => api.get<ApiResponse<unknown>>("/stats/asset/customer"),
  assetByProcessor: () => api.get<ApiResponse<unknown>>("/stats/asset/processor"),
};

export const settingsApi = {
  get: () => api.get<ApiResponse<unknown>>("/settings"),
  update: (data: unknown) => api.put<ApiResponse<unknown>>("/settings", data),
};

export const hierarchyApi = {
  get: () => api.get<ApiResponse<{ levels: unknown[]; tree: unknown[] }>>("/hierarchy"),
  createLevel: (data: unknown) => api.post<ApiResponse<unknown>>("/hierarchy/levels", data),
  createNode: (data: unknown) => api.post<ApiResponse<unknown>>("/hierarchy/nodes", data),
};
