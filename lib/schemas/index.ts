import { z } from "zod";
import { convertFirestoreDate } from "@/lib/utils/dateHelpers";

// Helper para convertir Timestamp de Firestore a Date
const zFirestoreDate = () =>
  z.union([
    z.date(),
    z.object({
      toDate: z.function().returns(z.date()),
      seconds: z.number(),
      nanoseconds: z.number(),
    }),
  ]).transform((val) => {
    if (val instanceof Date) return val;
    return convertFirestoreDate(val);
  });

// UserRole enum
export const UserRole = z.enum(["admin", "manager", "cashier"]);
export type UserRoleType = z.infer<typeof UserRole>;

// ProductVariation
export const zProductVariation = () =>
  z.object({
    id: z.string(),
    type: z.string(),
    value: z.string(),
    sku: z.string().optional(),
  });

// User
export const zUser = () =>
  z.object({
    id: z.string(),
    email: z.string().email(),
    role: UserRole,
    branchId: z.string().optional(),
    name: z.string(),
    createdAt: zFirestoreDate(),
  });

// Warehouse
export const zWarehouse = () =>
  z.object({
    id: z.string(),
    name: z.string(),
    address: z.string().optional(),
    createdAt: zFirestoreDate(),
    createdBy: z.string(),
  });

// Branch
export const zBranch = () =>
  z.object({
    id: z.string(),
    name: z.string(),
    address: z.string().optional(),
    createdAt: zFirestoreDate(),
    createdBy: z.string(),
  });

// InventoryWarehouse
export const zInventoryWarehouse = () =>
  z.object({
    id: z.string(),
    warehouseId: z.string(),
    name: z.string(),
    type: z.string(),
    category: z.string().optional(),
    taxStatus: z.string(),
    priceIncludesTax: z.boolean(),
    barcode: z.string().optional(),
    condition: z.string().optional(),
    images: z.array(z.string()),
    variations: z.array(zProductVariation()),
    variationId: z.string().optional(),
    quantity: z.number(),
    purchasePrice: z.number(),
    salePrice: z.number(),
    lastUpdated: zFirestoreDate(),
  });

// InventoryBranch
export const zInventoryBranch = () =>
  z.object({
    id: z.string(),
    branchId: z.string(),
    name: z.string(),
    productId: z.string().optional(),
    variationId: z.string().optional(),
    variations: z.array(zProductVariation()).optional(),
    quantity: z.number(),
    purchasePrice: z.number(),
    salePrice: z.number(),
    barcode: z.string().optional(),
    lastUpdated: zFirestoreDate(),
  });

// Transfer
export const zTransfer = () =>
  z.object({
    id: z.string(),
    warehouseId: z.string(),
    branchId: z.string(),
    inventoryWarehouseId: z.string().optional(),
    inventoryBranchId: z.string().optional(),
    variationId: z.string().optional(),
    quantity: z.number(),
    direction: z.enum(["warehouse_to_branch", "branch_to_warehouse"]).optional(),
    transferredBy: z.string(),
    transferredAt: zFirestoreDate(),
  });

// Sale
export const zSale = () =>
  z.object({
    id: z.string(),
    branchId: z.string(),
    inventoryBranchId: z.string(),
    variationId: z.string().optional(),
    quantity: z.number(),
    unitPrice: z.number(),
    totalPrice: z.number(),
    purchasePrice: z.number(),
    soldBy: z.string(),
    soldAt: zFirestoreDate(),
  });

// Response schemas
export const zGetUsersResponse = () => z.array(zUser());
export const zGetWarehousesResponse = () => z.array(zWarehouse());
export const zGetBranchesResponse = () => z.array(zBranch());
export const zGetInventoryWarehouseResponse = () => z.array(zInventoryWarehouse());
export const zGetInventoryBranchResponse = () => z.array(zInventoryBranch());
export const zGetTransfersResponse = () => z.array(zTransfer());
export const zGetSalesResponse = () => z.array(zSale());

// Type exports
export type User = z.infer<ReturnType<typeof zUser>>;
export type Warehouse = z.infer<ReturnType<typeof zWarehouse>>;
export type Branch = z.infer<ReturnType<typeof zBranch>>;
export type InventoryWarehouse = z.infer<ReturnType<typeof zInventoryWarehouse>>;
export type InventoryBranch = z.infer<ReturnType<typeof zInventoryBranch>>;
export type Transfer = z.infer<ReturnType<typeof zTransfer>>;
export type Sale = z.infer<ReturnType<typeof zSale>>;
export type ProductVariation = z.infer<ReturnType<typeof zProductVariation>>;
