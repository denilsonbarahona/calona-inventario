"use client";

import { useState, useEffect } from "react";
import { Sale, InventoryBranch } from "@/types";
import { getDocuments, getDocument } from "@/lib/firebase/firestore";
import { calculateTotalProfit } from "@/lib/utils/calculations";
import { convertFirestoreDate } from "@/lib/utils/dateHelpers";
import { format } from "date-fns";
import { collection, query, where, orderBy, Timestamp, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export default function ProfitsReportPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<Record<string, InventoryBranch>>({});
  const [profitByProduct, setProfitByProduct] = useState<Record<string, number>>({});

  useEffect(() => {
    loadSales();
  }, [startDate, endDate]);

  const loadSales = async () => {
    setLoading(true);
    try {
      // Parse dates manually to avoid timezone issues
      const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
      const start = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
      
      const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
      const end = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

      const salesRef = collection(db, "sales");
      const q = query(
        salesRef,
        where("soldAt", ">=", Timestamp.fromDate(start)),
        where("soldAt", "<=", Timestamp.fromDate(end)),
        orderBy("soldAt", "desc")
      );

      const querySnapshot = await getDocs(q);
      const salesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        soldAt: convertFirestoreDate(doc.data().soldAt),
      })) as Sale[];

      setSales(salesData);

      // Load inventory items first to get product names
      const inventoryBranchIds = [
        ...new Set(
          salesData
            .map((s) => s.inventoryBranchId)
            .filter((id): id is string => !!id)
        ),
      ];

      const inventoryMap: Record<string, InventoryBranch> = {};
      for (const id of inventoryBranchIds) {
        const inventoryItem = await getDocument("inventory_branch", id);
        if (inventoryItem) {
          inventoryMap[id] = {
            ...inventoryItem,
            lastUpdated: convertFirestoreDate(inventoryItem.lastUpdated),
          } as InventoryBranch;
        }
      }
      setInventoryItems(inventoryMap);

      // Calculate profit by product (using inventoryBranchId as key)
      const profitMap: Record<string, number> = {};
      for (const sale of salesData) {
        if (sale.inventoryBranchId) {
          const profit = (sale.unitPrice - sale.purchasePrice) * sale.quantity;
          profitMap[sale.inventoryBranchId] =
            (profitMap[sale.inventoryBranchId] || 0) + profit;
        }
      }

      setProfitByProduct(profitMap);
    } catch (error) {
      console.error("Error loading sales:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalProfit = calculateTotalProfit(sales);
  const sortedProducts = Object.entries(profitByProduct).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Reporte de Ganancias</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
            />
          </div>
        </div>
        <button
          onClick={loadSales}
          className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
        >
          Buscar
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Resumen</h2>
        <div className="bg-green-50 p-6 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">Ganancia Total</p>
          <p className="text-3xl font-bold text-green-600">${totalProfit.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="text-xl font-semibold text-gray-700 p-6">Ganancias por Producto</h2>
        {loading ? (
          <div className="p-6 text-center">Cargando...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Ganancia Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedProducts.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-6 py-4 text-center text-gray-500">
                    No hay datos en el período seleccionado
                  </td>
                </tr>
              ) : (
                sortedProducts.map(([inventoryBranchId, profit]) => (
                  <tr key={inventoryBranchId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {inventoryItems[inventoryBranchId]?.name ||
                        "Producto no encontrado"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                      ${profit.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
