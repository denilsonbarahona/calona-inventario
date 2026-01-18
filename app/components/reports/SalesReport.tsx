"use client";

import { useState, useEffect } from "react";
import { Sale, InventoryBranch, Branch } from "@/types";
import { getDocuments, getDocument } from "@/lib/firebase/firestore";
import { collection, query, where, orderBy, Timestamp, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { calculateTotalSales, calculateTotalProfit } from "@/lib/utils/calculations";
import { format } from "date-fns";
import { convertFirestoreDate } from "@/lib/utils/dateHelpers";

export default function SalesReport() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<Record<string, InventoryBranch>>({});
  const [branches, setBranches] = useState<Record<string, Branch>>({});

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

      // Load inventory items and branches
      const inventoryBranchIds = [
        ...new Set(
          salesData
            .map((s) => s.inventoryBranchId)
            .filter((id): id is string => !!id)
        ),
      ];
      const branchIds = [...new Set(salesData.map((s) => s.branchId))];

      const inventoryMap: Record<string, InventoryBranch> = {};
      const branchMap: Record<string, Branch> = {};

      // Obtener productos desde inventory_branch
      for (const id of inventoryBranchIds) {
        const inventoryItem = await getDocument("inventory_branch", id);
        if (inventoryItem) {
          inventoryMap[id] = {
            ...inventoryItem,
            lastUpdated: convertFirestoreDate(inventoryItem.lastUpdated),
          } as InventoryBranch;
        }
      }

      for (const branchId of branchIds) {
        const branch = await getDocument("branches", branchId);
        if (branch) branchMap[branchId] = branch as Branch;
      }

      setInventoryItems(inventoryMap);
      setBranches(branchMap);
    } catch (error) {
      console.error("Error loading sales:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalSales = calculateTotalSales(sales);
  const totalProfit = calculateTotalProfit(sales);

  return (
    <div className="space-y-6">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total Ventas</p>
            <p className="text-2xl font-bold text-blue-600">${totalSales.toFixed(2)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total Ganancias</p>
            <p className="text-2xl font-bold text-green-600">${totalProfit.toFixed(2)}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Número de Ventas</p>
            <p className="text-2xl font-bold text-purple-600">{sales.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="text-xl font-semibold text-gray-700 p-6">Detalle de Ventas</h2>
        {loading ? (
          <div className="p-6 text-center">Cargando...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Sucursal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Cantidad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Precio Unitario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Ganancia
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No hay ventas en el período seleccionado
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(sale.soldAt, "dd/MM/yyyy HH:mm")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {branches[sale.branchId]?.name || sale.branchId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sale.inventoryBranchId
                        ? inventoryItems[sale.inventoryBranchId]?.name ||
                          "Producto no encontrado"
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sale.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${sale.unitPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${sale.totalPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      ${((sale.unitPrice - sale.purchasePrice) * sale.quantity).toFixed(2)}
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
