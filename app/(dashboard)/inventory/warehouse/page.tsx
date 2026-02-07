"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { InventoryWarehouse, Warehouse } from "@/types";
import {
  getDocuments,
  getDocumentsByField,
  deleteDocument,
} from "@/lib/firebase/firestore";
import { convertFirestoreDate } from "@/lib/utils/dateHelpers";
import { canManageProducts } from "@/lib/utils/permissions";
import { normalizeWarehouseDoc } from "@/lib/utils/inventoryHelpers";
import InventoryTable from "@/app/components/inventory/InventoryTable";

export default function WarehouseInventoryPage() {
  const { userData } = useAuth();
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
        })) as Warehouse[],
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
      const data = await getDocumentsByField(
        "inventory_warehouse",
        "warehouseId",
        selectedWarehouse,
      );
      setInventory(
        data.map((item) => {
          const normalized = normalizeWarehouseDoc({ ...item, id: item.id });
          return {
            ...normalized,
            lastUpdated: convertFirestoreDate(item.lastUpdated as unknown),
          } as InventoryWarehouse;
        }),
      );
    } catch (error) {
      console.error("Error loading inventory:", error);
    }
  };

  const totalQuantity = (doc: InventoryWarehouse) =>
    (doc.variations ?? []).reduce(
      (sum, v) => sum + (Number(v.quantity) ?? 0),
      0,
    );
  const inventoryRows = inventory.map((doc) => {
    const base = {
      ...doc,
      lastUpdated:
        doc.lastUpdated instanceof Date
          ? doc.lastUpdated
          : new Date(doc.lastUpdated as Date),
    };
    const variationsWithQty = doc.variations ?? [];
    const variationLines =
      variationsWithQty.length > 0
        ? variationsWithQty.map((v) => ({
            label: `${v.type}: ${v.value}`,
            quantity: v.quantity ?? 0,
          }))
        : undefined;
    return {
      ...base,
      rowId: doc.id,
      quantity: totalQuantity(doc),
      variation: variationsWithQty[0]
        ? {
            id: variationsWithQty[0].id,
            type: variationsWithQty[0].type,
            value: variationsWithQty[0].value,
            sku: variationsWithQty[0].sku,
          }
        : { id: "default", type: "default", value: "Único" },
      variationLines,
    };
  });

  const handleDelete = async (id: string) => {
    const docItem = inventory.find((i) => i.id === id);
    const label = docItem
      ? docItem.hasVariations
        ? `${docItem.name} (y todas sus variaciones)`
        : docItem.name
      : "este producto";
    if (
      !window.confirm(
        `¿Eliminar "${label}" de esta bodega? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    try {
      await deleteDocument("inventory_warehouse", id);
      await loadInventory();
    } catch (error) {
      console.error("Error al eliminar:", error);
      alert("No se pudo eliminar. Intenta de nuevo.");
    }
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Inventario de Bodegas
      </h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Seleccionar Bodega
        </label>
        <div className="relative w-full md:w-64">
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 appearance-none cursor-pointer hover:border-gray-400"
          >
            <option value="">Seleccione una bodega</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>

      {selectedWarehouse && (
        <InventoryTable
          inventory={inventoryRows}
          type="warehouse"
          onDelete={
            userData && canManageProducts(userData.role)
              ? handleDelete
              : undefined
          }
        />
      )}
    </div>
  );
}
