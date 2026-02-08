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

export interface Category {
  id: string;
  name: string;
}

export interface ProductVariation {
  id: string;
  type: string; // "talla", "color", "tamaño", etc.
  value: string; // "M", "Rojo", "Grande", etc.
  sku?: string;
}

/** Variación con cantidad (cantidad dentro de cada variación). */
export interface ProductVariationWithQuantity extends ProductVariation {
  sku?: string;
  quantity: number;
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
  name: string;
  type: string;
  category?: string;
  taxStatus: string;
  priceIncludesTax: boolean;
  barcode?: string;
  condition?: string;
  images: string[];
  /** true = producto con variaciones; false = producto único (variación "default"). */
  hasVariations: boolean;
  /** Variaciones con cantidad en cada una. Siempre al menos uno. */
  variations: ProductVariationWithQuantity[];
  purchasePrice: number;
  salePrice: number;
  lastUpdated: Date;
}

/** Fila aplanada para listados/transferencias (un doc → N filas por variación con cantidad). */
export interface InventoryWarehouseRow {
  id: string;
  rowId: string;
  warehouseId: string;
  name: string;
  type: string;
  category?: string;
  taxStatus: string;
  priceIncludesTax: boolean;
  barcode?: string;
  condition?: string;
  images: string[];
  variations: ProductVariation[];
  variation: ProductVariation;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  lastUpdated: Date;
  /** Si se define, se muestra en lugar del label de variation (ej. "Múltiples variaciones"). */
  variationDisplay?: string;
  /** Si se define, se muestran debajo del nombre: cada variación con su cantidad (label — quantity). */
  variationLines?: { label: string; quantity: number }[];
}

export interface InventoryBranch {
  id: string;
  branchId: string;
  name: string;
  productId?: string;
  /** Variación de ESTE ítem. null = producto sin variaciones. Un doc = un SKU. */
  variation?: ProductVariation | null;
  /** Variaciones con cantidad (un elemento por doc en sucursal). Se deriva quantity de variations[0]?.quantity. */
  variations?: ProductVariationWithQuantity[];
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  barcode?: string;
  lastUpdated: Date;
}

export interface Transfer {
  id: string;
  warehouseId: string;
  branchId: string;
  inventoryWarehouseId?: string;
  inventoryBranchId?: string;
  variationId?: string; // variación transferida (un doc bodega puede tener varias)
  quantity: number;
  direction?: "warehouse_to_branch" | "branch_to_warehouse";
  transferredBy: string;
  transferredAt: Date;
}

export interface Sale {
  id: string;
  branchId: string;
  inventoryBranchId: string; // ID del item en inventory_branch
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  purchasePrice: number;
  soldBy: string;
  soldAt: Date;
}
