"use client";

import { useState, useEffect } from "react";
import { Warehouse, Branch, InventoryWarehouse } from "@/types";
import type { InventoryWarehouseRow } from "@/types";
import { getDocuments, getDocumentsByField } from "@/lib/firebase/firestore";
import { convertFirestoreDate } from "@/lib/utils/dateHelpers";
import {
  getVariationLabel,
  flattenWarehouseProduct,
  normalizeWarehouseDoc,
} from "@/lib/utils/inventoryHelpers";

const OPTION_VALUE_SEP = "|";

interface TransferFormProps {
  onSubmit: (data: {
    warehouseId: string;
    branchId: string;
    inventoryWarehouseId: string;
    variationId: string;
    quantity: number;
  }) => Promise<void>;
  onCancel: () => void;
}

export default function TransferForm({
  onSubmit,
  onCancel,
}: TransferFormProps) {
  const [formData, setFormData] = useState({
    warehouseId: "",
    branchId: "",
    inventoryWarehouseId: "",
    quantity: 0,
  });
  const [quantityInput, setQuantityInput] = useState<string>("1");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [inventory, setInventory] = useState<InventoryWarehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadWarehouses();
    loadBranches();
  }, []);

  useEffect(() => {
    if (formData.warehouseId) {
      loadInventory();
    } else {
      setInventory([]);
      setFormData((prev) => ({ ...prev, inventoryWarehouseId: "" }));
    }
  }, [formData.warehouseId]);

  const loadWarehouses = async () => {
    const data = await getDocuments("warehouses");
    setWarehouses(
      data.map((w) => ({
        ...w,
        createdAt: convertFirestoreDate(w.createdAt),
      })) as Warehouse[],
    );
  };

  const loadBranches = async () => {
    const data = await getDocuments("branches");
    setBranches(
      data.map((b) => ({
        ...b,
        createdAt: convertFirestoreDate(b.createdAt),
      })) as Branch[],
    );
  };

  const loadInventory = async () => {
    if (!formData.warehouseId) return;

    const data = await getDocumentsByField(
      "inventory_warehouse",
      "warehouseId",
      formData.warehouseId,
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
  };

  const inventoryRows: InventoryWarehouseRow[] = inventory
    .flatMap((doc) =>
      flattenWarehouseProduct({
        ...doc,
        lastUpdated:
          doc.lastUpdated instanceof Date
            ? doc.lastUpdated
            : new Date(doc.lastUpdated as Date),
      }),
    )
    .filter((row) => row.quantity > 0);

  const selectedOptionValue = formData.inventoryWarehouseId;
  const [selectedProductId, selectedVariationId] = selectedOptionValue.includes(
    OPTION_VALUE_SEP,
  )
    ? selectedOptionValue.split(OPTION_VALUE_SEP)
    : [selectedOptionValue, "default"];
  const selectedRow = inventoryRows.find(
    (row) =>
      row.id === selectedProductId && row.variation.id === selectedVariationId,
  );
  const availableQuantity = selectedRow?.quantity ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (
      !formData.warehouseId ||
      !formData.branchId ||
      !formData.inventoryWarehouseId ||
      !selectedRow
    ) {
      setError("Todos los campos son requeridos");
      return;
    }

    if (formData.quantity <= 0) {
      setError("La cantidad debe ser mayor a 0");
      return;
    }

    if (formData.quantity > availableQuantity) {
      setError("No hay suficiente inventario disponible");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        warehouseId: formData.warehouseId,
        branchId: formData.branchId,
        inventoryWarehouseId: selectedProductId,
        variationId: selectedVariationId,
        quantity: formData.quantity,
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al transferir inventario",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Bodega *
        </label>
        <div className="relative">
          <select
            value={formData.warehouseId}
            onChange={(e) =>
              setFormData({
                ...formData,
                warehouseId: e.target.value,
                inventoryWarehouseId: "",
              })
            }
            required
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sucursal *
        </label>
        <div className="relative">
          <select
            value={formData.branchId}
            onChange={(e) =>
              setFormData({ ...formData, branchId: e.target.value })
            }
            required
            className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 appearance-none cursor-pointer hover:border-gray-400"
          >
            <option value="">Seleccione una sucursal</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Producto *
        </label>
        <div className="relative">
          <select
            value={formData.inventoryWarehouseId}
            onChange={(e) =>
              setFormData({
                ...formData,
                inventoryWarehouseId: e.target.value,
              })
            }
            required
            disabled={!formData.warehouseId}
            className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 appearance-none cursor-pointer hover:border-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-500"
          >
            <option value="">Seleccione un producto</option>
            {inventoryRows.map((row) => {
              const optionValue = `${row.id}${OPTION_VALUE_SEP}${row.variation.id}`;
              const variationLabel = getVariationLabel(row);
              return (
                <option key={row.rowId} value={optionValue}>
                  {row.name}
                  {variationLabel ? ` - ${variationLabel}` : ""} (Stock:{" "}
                  {row.quantity})
                </option>
              );
            })}
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
        {inventoryRows.length === 0 && formData.warehouseId && (
          <p className="text-sm text-gray-500 mt-1">
            No hay productos disponibles en esta bodega
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cantidad *
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={quantityInput}
          onChange={(e) => {
            const value = e.target.value;
            // Permitir valores vacíos y solo números
            if (value === "" || /^\d+$/.test(value)) {
              setQuantityInput(value);
              if (value !== "") {
                const val = parseInt(value, 10);
                if (!isNaN(val)) {
                  // Validar que no exceda el máximo disponible
                  const finalVal = Math.min(
                    Math.max(1, val),
                    availableQuantity,
                  );
                  setFormData({ ...formData, quantity: finalVal });
                  // Si el valor fue ajustado al máximo, actualizar el input
                  if (val > availableQuantity) {
                    setQuantityInput(availableQuantity.toString());
                  }
                }
              }
            }
          }}
          onBlur={(e) => {
            // Si está vacío al perder el foco, restaurar a 1
            if (e.target.value === "") {
              setQuantityInput("1");
              setFormData({ ...formData, quantity: 1 });
            } else {
              // Asegurar que el input muestre el valor correcto
              setQuantityInput(formData.quantity.toString());
            }
          }}
          onFocus={(e) => {
            // Seleccionar todo el texto al hacer focus para facilitar reemplazo
            e.target.select();
          }}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
        />
        <p className="text-sm text-gray-500 mt-1">
          Disponible: {availableQuantity} unidades
        </p>
      </div>

      <div className="flex space-x-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? "Transferiendo..." : "Transferir"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
