/**
 * Query Keys Factory Pattern
 * Centraliza y organiza todas las query keys de React Query
 * Siguiendo el patrón recomendado por TanStack Query
 */

export const queryKeys = {
  // Users
  users: {
    all: ["users"] as const,
    lists: () => [...queryKeys.users.all, "list"] as const,
    list: (filters?: Record<string, any>) =>
      [...queryKeys.users.lists(), { filters }] as const,
    details: () => [...queryKeys.users.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },

  // Warehouses
  warehouses: {
    all: ["warehouses"] as const,
    lists: () => [...queryKeys.warehouses.all, "list"] as const,
    list: (filters?: Record<string, any>) =>
      [...queryKeys.warehouses.lists(), { filters }] as const,
    details: () => [...queryKeys.warehouses.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.warehouses.details(), id] as const,
  },

  // Branches
  branches: {
    all: ["branches"] as const,
    lists: () => [...queryKeys.branches.all, "list"] as const,
    list: (filters?: Record<string, any>) =>
      [...queryKeys.branches.lists(), { filters }] as const,
    details: () => [...queryKeys.branches.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.branches.details(), id] as const,
  },

  // Inventory Warehouse
  inventoryWarehouse: {
    all: ["inventory_warehouse"] as const,
    lists: () => [...queryKeys.inventoryWarehouse.all, "list"] as const,
    list: (warehouseId?: string) =>
      [...queryKeys.inventoryWarehouse.lists(), { warehouseId }] as const,
    details: () => [...queryKeys.inventoryWarehouse.all, "detail"] as const,
    detail: (id: string) =>
      [...queryKeys.inventoryWarehouse.details(), id] as const,
  },

  // Inventory Branch
  inventoryBranch: {
    all: ["inventory_branch"] as const,
    lists: () => [...queryKeys.inventoryBranch.all, "list"] as const,
    list: (branchId?: string) =>
      [...queryKeys.inventoryBranch.lists(), { branchId }] as const,
    details: () => [...queryKeys.inventoryBranch.all, "detail"] as const,
    detail: (id: string) =>
      [...queryKeys.inventoryBranch.details(), id] as const,
  },

  // Sales
  sales: {
    all: ["sales"] as const,
    lists: () => [...queryKeys.sales.all, "list"] as const,
    list: (filters?: {
      startDate?: string;
      endDate?: string;
      branchId?: string;
    }) => [...queryKeys.sales.lists(), { filters }] as const,
    today: (branchId?: string) =>
      [...queryKeys.sales.all, "today", { branchId }] as const,
  },

  // Transfers
  transfers: {
    all: ["transfers"] as const,
    lists: () => [...queryKeys.transfers.all, "list"] as const,
    list: (filters?: Record<string, any>) =>
      [...queryKeys.transfers.lists(), { filters }] as const,
    details: () => [...queryKeys.transfers.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.transfers.details(), id] as const,
  },

  // Dashboard
  dashboard: {
    all: ["dashboard"] as const,
    stats: () => [...queryKeys.dashboard.all, "stats"] as const,
  },
} as const;

// Helper para invalidar todas las queries relacionadas
export const invalidateQueries = {
  users: {
    all: () => queryKeys.users.all,
    lists: () => queryKeys.users.lists(),
  },
  warehouses: {
    all: () => queryKeys.warehouses.all,
    lists: () => queryKeys.warehouses.lists(),
  },
  branches: {
    all: () => queryKeys.branches.all,
    lists: () => queryKeys.branches.lists(),
  },
  inventoryWarehouse: {
    all: () => queryKeys.inventoryWarehouse.all,
    lists: () => queryKeys.inventoryWarehouse.lists(),
  },
  inventoryBranch: {
    all: () => queryKeys.inventoryBranch.all,
    lists: () => queryKeys.inventoryBranch.lists(),
  },
  sales: {
    all: () => queryKeys.sales.all,
    lists: () => queryKeys.sales.lists(),
  },
  transfers: {
    all: () => queryKeys.transfers.all,
    lists: () => queryKeys.transfers.lists(),
  },
  dashboard: {
    all: () => queryKeys.dashboard.all,
    stats: () => queryKeys.dashboard.stats(),
  },
};

// Mantener compatibilidad con el código anterior
export const QUERY_KEYS = queryKeys;
