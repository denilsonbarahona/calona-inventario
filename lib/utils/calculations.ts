import { Sale } from "@/types";

export const calculateProfit = (sale: Sale): number => {
  return (sale.unitPrice - sale.purchasePrice) * sale.quantity;
};

export const calculateTotalSales = (sales: Sale[]): number => {
  return sales.reduce((total, sale) => total + sale.totalPrice, 0);
};

export const calculateTotalProfit = (sales: Sale[]): number => {
  return sales.reduce((total, sale) => total + calculateProfit(sale), 0);
};

export const calculateTotalIncome = (sales: Sale[]): number => {
  return calculateTotalSales(sales);
};
