"use client";

import { useEffect, useState } from "react";
import { InventoryWarehouse, Warehouse } from "@/types";
import { getDocuments, getDocumentsByField } from "@/lib/firebase/firestore";
import { convertFirestoreDate } from "@/lib/utils/dateHelpers";
import InventoryTable from "@/app/components/inventory/InventoryTable";

export default function WarehouseInventoryPage() {
  const [inventory, setInventory] = useState<InventoryWarehouse[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    if (selectedWarehouse) {
      loadInventory();
    } else {
      setInventory([]);
    }
  }, [selectedWarehouse]);

  const loadWarehouses = async () => {
    try {
      const data = await getDocuments("warehouses");
      setWarehouses(
        data.map((w) => ({
          ...w,
          createdAt: convertFirestoreDate(w.createdAt),
        })) as Warehouse[]
      );
    } catch (error) {
      console.error("Error loading warehouses:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadInventory = async () => {
    if (!selectedWarehouse) return;

    try {
      const data = await getDocumentsByField("inventory_warehouse", "warehouseId", selectedWarehouse);
      setInventory(
        data.map((item) => ({
          ...item,
          lastUpdated: convertFirestoreDate(item.lastUpdated),
        })) as InventoryWarehouse[]
      );
    } catch (error) {
      console.error("Error loading inventory:", error);
    }
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Inventario de Bodegas</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Bodega</label>
        <select
          value={selectedWarehouse}
          onChange={(e) => setSelectedWarehouse(e.target.value)}
          className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
        >
          <option value="">Seleccione una bodega</option>
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name}
            </option>
          ))}
        </select>
      </div>

      {selectedWarehouse && <InventoryTable inventory={inventory} type="warehouse" />}
    </div>
  );
}
