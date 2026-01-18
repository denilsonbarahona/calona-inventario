import { UserRole } from "@/types";

export const canCreateWarehouse = (role: UserRole): boolean => {
  return role === "admin";
};

export const canCreateBranch = (role: UserRole): boolean => {
  return role === "admin";
};

export const canManageUsers = (role: UserRole): boolean => {
  return role === "admin";
};

export const canTransferInventory = (role: UserRole): boolean => {
  return role === "admin" || role === "manager";
};

export const canSell = (role: UserRole): boolean => {
  return role === "admin" || role === "manager" || role === "cashier";
};

export const canViewReports = (role: UserRole): boolean => {
  return role === "admin" || role === "manager";
};

export const canManageProducts = (role: UserRole): boolean => {
  return role === "admin" || role === "manager";
};
