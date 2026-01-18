export type UserRole = "admin" | "manager" | "cashier";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  branchId?: string;
  name: string;
  createdAt: Date;
}

export interface Warehouse {
  id: string;
  name: string;
  address?: string;
  createdAt: Date;
  createdBy: string;
}

export interface Branch {
  id: string;
  name: string;
  address?: string;
  createdAt: Date;
  createdBy: string;
}

export interface ProductVariation {
  id: string;
  type: string; // "talla", "color", "tamaño", etc.
  value: string; // "M", "Rojo", "Grande", etc.
  sku?: string;
}

export interface Product {
  id: string;
  name: string;
  type: string;
  category?: string;
  taxStatus: string;
  priceIncludesTax: boolean;
  barcode?: string;
  condition?: string;
  images: string[];
  variations: ProductVariation[];
  createdAt: Date;
}

export interface InventoryWarehouse {
  id: string;
  warehouseId: string;
  // Información completa del producto (ya no referencia a products)
  name: string;
  type: string;
  category?: string;
  taxStatus: string;
  priceIncludesTax: boolean;
  barcode?: string;
  condition?: string;
  images: string[];
  variations: ProductVariation[];
  // Inventario
  variationId?: string; // Si es una variación específica
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  lastUpdated: Date;
}

export interface InventoryBranch {
  id: string;
  branchId: string;
  // Información del producto (copiada desde bodega)
  name: string;
  productId?: string; // Referencia opcional al producto en bodega (para tracking)
  variationId?: string;
  variations?: ProductVariation[]; // Variaciones disponibles (copiadas desde bodega)
  quantity: number;
  // Precios (copiados desde bodega al transferir)
  purchasePrice: number;
  salePrice: number;
  barcode?: string; // Código de barras (copiado desde bodega)
  lastUpdated: Date;
}

export interface Transfer {
  id: string;
  warehouseId: string;
  branchId: string;
  inventoryWarehouseId?: string; // ID del item en inventory_warehouse (para transferencias bodega → sucursal)
  inventoryBranchId?: string; // ID del item en inventory_branch (para transferencias sucursal → bodega)
  variationId?: string;
  quantity: number;
  direction?: "warehouse_to_branch" | "branch_to_warehouse"; // Dirección de la transferencia
  transferredBy: string;
  transferredAt: Date;
}

export interface Sale {
  id: string;
  branchId: string;
  inventoryBranchId: string; // ID del item en inventory_branch
  variationId?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  purchasePrice: number;
  soldBy: string;
  soldAt: Date;
}
