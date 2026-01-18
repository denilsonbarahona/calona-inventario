"use client";

import { useState, useEffect } from "react";
import { Transfer, Warehouse, Branch, InventoryWarehouse, User } from "@/types";
import { getDocuments, getDocument } from "@/lib/firebase/firestore";
import { convertFirestoreDate } from "@/lib/utils/dateHelpers";
import { format } from "date-fns";

export default function TransfersReportPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<Record<string, Warehouse>>({});
  const [branches, setBranches] = useState<Record<string, Branch>>({});
  const [inventoryItems, setInventoryItems] = useState<Record<string, InventoryWarehouse>>({});
  const [users, setUsers] = useState<Record<string, User>>({});

  useEffect(() => {
    loadTransfers();
  }, []);

  const loadTransfers = async () => {
    try {
      const data = await getDocuments("transfers");
      const transfersData = data.map((t) => ({
        ...t,
        transferredAt: convertFirestoreDate(t.transferredAt),
      })) as Transfer[];

      setTransfers(transfersData.sort((a, b) => b.transferredAt.getTime() - a.transferredAt.getTime()));

      // Load related data
      const warehouseIds = [...new Set(transfersData.map((t) => t.warehouseId))];
      const branchIds = [...new Set(transfersData.map((t) => t.branchId))];
      const userIds = [...new Set(transfersData.map((t) => t.transferredBy))];
      const inventoryWarehouseIds = [
        ...new Set(
          transfersData
            .map((t) => t.inventoryWarehouseId)
            .filter((id): id is string => !!id)
        ),
      ];

      const warehouseMap: Record<string, Warehouse> = {};
      const branchMap: Record<string, Branch> = {};
      const userMap: Record<string, User> = {};
      const inventoryMap: Record<string, InventoryWarehouse> = {};

      for (const id of warehouseIds) {
        const warehouse = await getDocument("warehouses", id);
        if (warehouse) warehouseMap[id] = warehouse as Warehouse;
      }

      for (const id of branchIds) {
        const branch = await getDocument("branches", id);
        if (branch) branchMap[id] = branch as Branch;
      }

      // Cargar usuarios para mostrar nombres
      for (const id of userIds) {
        const user = await getDocument("users", id);
        if (user) {
          userMap[id] = {
            ...user,
            createdAt: convertFirestoreDate(user.createdAt),
          } as User;
        }
      }

      // Obtener productos desde inventory_warehouse
      for (const id of inventoryWarehouseIds) {
        const inventoryItem = await getDocument("inventory_warehouse", id);
        if (inventoryItem) {
          inventoryMap[id] = {
            ...inventoryItem,
            lastUpdated: convertFirestoreDate(inventoryItem.lastUpdated),
          } as InventoryWarehouse;
        }
      }

      setWarehouses(warehouseMap);
      setBranches(branchMap);
      setUsers(userMap);
      setInventoryItems(inventoryMap);
    } catch (error) {
      console.error("Error loading transfers:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Reporte de Transferencias</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
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
                  Origen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Destino
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Cantidad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Transferido por
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No hay transferencias registradas
                  </td>
                </tr>
              ) : (
                transfers.map((transfer) => {
                  // Determinar origen y destino basándose en la dirección
                  const isWarehouseToBranch =
                    transfer.direction === "warehouse_to_branch" ||
                    (!transfer.direction && transfer.warehouseId && transfer.branchId);
                  
                  const origin = isWarehouseToBranch
                    ? warehouses[transfer.warehouseId]?.name || transfer.warehouseId
                    : branches[transfer.branchId]?.name || transfer.branchId;
                  
                  const destination = isWarehouseToBranch
                    ? branches[transfer.branchId]?.name || transfer.branchId
                    : warehouses[transfer.warehouseId]?.name || transfer.warehouseId;

                  return (
                    <tr key={transfer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(transfer.transferredAt, "dd/MM/yyyy HH:mm")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {origin}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {destination}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transfer.inventoryWarehouseId
                          ? inventoryItems[transfer.inventoryWarehouseId]?.name ||
                            "Producto no encontrado"
                          : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transfer.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {users[transfer.transferredBy]?.name || transfer.transferredBy}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
