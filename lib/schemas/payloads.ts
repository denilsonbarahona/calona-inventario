import { z } from "zod";

// Payload schemas para crear/actualizar entidades

// User payloads
export const zCreateUserPayload = () =>
  z.object({
    email: z.string().email("Email inválido"),
    name: z.string().min(1, "El nombre es requerido"),
    role: z.enum(["admin", "manager", "cashier"]),
    branchId: z.string().optional(),
  });

export const zUpdateUserPayload = () =>
  z.object({
    email: z.string().email("Email inválido").optional(),
    name: z.string().min(1, "El nombre es requerido").optional(),
    role: z.enum(["admin", "manager", "cashier"]).optional(),
    branchId: z.string().optional(),
  });

// Warehouse payloads
export const zCreateWarehousePayload = () =>
  z.object({
    name: z.string().min(1, "El nombre es requerido"),
    address: z.string().optional(),
    createdBy: z.string().min(1, "createdBy es requerido"),
  });

export const zUpdateWarehousePayload = () =>
  z.object({
    name: z.string().min(1, "El nombre es requerido").optional(),
    address: z.string().optional(),
  });

// Branch payloads
export const zCreateBranchPayload = () =>
  z.object({
    name: z.string().min(1, "El nombre es requerido"),
    address: z.string().optional(),
    createdBy: z.string().min(1, "createdBy es requerido"),
  });

export const zUpdateBranchPayload = () =>
  z.object({
    name: z.string().min(1, "El nombre es requerido").optional(),
    address: z.string().optional(),
  });

// ProductVariation payload
export const zProductVariationPayload = () =>
  z.object({
    id: z.string(),
    type: z.string().min(1, "El tipo es requerido"),
    value: z.string().min(1, "El valor es requerido"),
    sku: z.string().optional(),
  });

// InventoryWarehouse payloads
export const zCreateInventoryWarehousePayload = () =>
  z.object({
    warehouseId: z.string().min(1, "warehouseId es requerido"),
    name: z.string().min(1, "El nombre es requerido"),
    type: z.string().min(1, "El tipo es requerido"),
    category: z.string().optional(),
    taxStatus: z.string().min(1, "taxStatus es requerido"),
    priceIncludesTax: z.boolean(),
    barcode: z.string().optional(),
    condition: z.string().optional(),
    images: z.array(z.string()),
    variations: z.array(zProductVariationPayload()),
    quantity: z.number().int().min(0, "La cantidad debe ser mayor o igual a 0"),
    purchasePrice: z.number().min(0, "El precio de compra debe ser mayor o igual a 0"),
    salePrice: z.number().min(0, "El precio de venta debe ser mayor o igual a 0"),
  });

export const zUpdateInventoryWarehousePayload = () =>
  zCreateInventoryWarehousePayload().partial();

// InventoryBranch payloads (para transferencias)
export const zCreateInventoryBranchPayload = () =>
  z.object({
    branchId: z.string().min(1, "branchId es requerido"),
    name: z.string().min(1, "El nombre es requerido"),
    productId: z.string().optional(),
    variations: z.array(zProductVariationPayload()).optional(),
    quantity: z.number().int().min(0, "La cantidad debe ser mayor o igual a 0"),
    purchasePrice: z.number().min(0, "El precio de compra debe ser mayor o igual a 0"),
    salePrice: z.number().min(0, "El precio de venta debe ser mayor o igual a 0"),
    barcode: z.string().optional(),
  });

// Sale payload
export const zCreateSalePayload = () =>
  z.object({
    inventoryBranchId: z.string().min(1, "inventoryBranchId es requerido"),
    quantity: z.number().int().positive("La cantidad debe ser mayor a 0"),
    branchId: z.string().min(1, "branchId es requerido"),
    userId: z.string().min(1, "userId es requerido"),
  });

// Transfer payload
export const zCreateTransferPayload = () =>
  z.object({
    warehouseId: z.string().min(1, "warehouseId es requerido"),
    branchId: z.string().min(1, "branchId es requerido"),
    inventoryWarehouseId: z.string().optional(),
    inventoryBranchId: z.string().optional(),
    quantity: z.number().int().positive("La cantidad debe ser mayor a 0"),
    direction: z.enum(["warehouse_to_branch", "branch_to_warehouse"]).optional(),
    transferredBy: z.string().min(1, "transferredBy es requerido"),
  });

// Type exports
export type CreateUserPayload = z.infer<ReturnType<typeof zCreateUserPayload>>;
export type UpdateUserPayload = z.infer<ReturnType<typeof zUpdateUserPayload>>;
export type CreateWarehousePayload = z.infer<ReturnType<typeof zCreateWarehousePayload>>;
export type UpdateWarehousePayload = z.infer<ReturnType<typeof zUpdateWarehousePayload>>;
export type CreateBranchPayload = z.infer<ReturnType<typeof zCreateBranchPayload>>;
export type UpdateBranchPayload = z.infer<ReturnType<typeof zUpdateBranchPayload>>;
export type CreateInventoryWarehousePayload = z.infer<ReturnType<typeof zCreateInventoryWarehousePayload>>;
export type UpdateInventoryWarehousePayload = z.infer<ReturnType<typeof zUpdateInventoryWarehousePayload>>;
export type CreateInventoryBranchPayload = z.infer<ReturnType<typeof zCreateInventoryBranchPayload>>;
export type CreateSalePayload = z.infer<ReturnType<typeof zCreateSalePayload>>;
export type CreateTransferPayload = z.infer<ReturnType<typeof zCreateTransferPayload>>;
