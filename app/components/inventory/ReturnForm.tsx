"use client";

import { useState, useEffect } from "react";
import { Warehouse, Branch, InventoryBranch } from "@/types";
import { getDocuments, getDocumentsByField } from "@/lib/firebase/firestore";
import { convertFirestoreDate } from "@/lib/utils/dateHelpers";
import { getVariationLabel } from "@/lib/utils/inventoryHelpers";

interface ReturnFormProps {
  onSubmit: (data: {
    branchId: string;
    warehouseId: string;
    inventoryBranchId: string;
    variationId: string;
    quantity: number;
  }) => Promise<void>;
  onCancel: () => void;
}

export default function ReturnForm({ onSubmit, onCancel }: ReturnFormProps) {
  const [formData, setFormData] = useState({
    branchId: "",
    warehouseId: "",
    inventoryBranchId: "",
    variationId: "",
    quantity: 0,
  });
  const [quantityInput, setQuantityInput] = useState<string>("1");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [inventory, setInventory] = useState<InventoryBranch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadWarehouses();
    loadBranches();
  }, []);

  useEffect(() => {
    if (formData.branchId) {
      loadInventory();
    } else {
      setInventory([]);
      setFormData((prev) => ({
        ...prev,
        inventoryBranchId: "",
        variationId: "",
      }));
    }
  }, [formData.branchId]);

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
    if (!formData.branchId) return;

    const data = await getDocumentsByField(
      "inventory_branch",
      "branchId",
      formData.branchId,
    );
    setInventory(
      data
        .filter((item) => (item.quantity || 0) > 0)
        .map((item) => ({
          ...item,
          lastUpdated: convertFirestoreDate(item.lastUpdated),
        })) as InventoryBranch[],
    );
  };

  const selectedInventoryItem = inventory.find(
    (item) => item.id === formData.inventoryBranchId,
  );
  const variationsWithQty: {
    id: string;
    type: string;
    value: string;
    quantity: number;
  }[] =
    (selectedInventoryItem?.variations?.length ?? 0) > 0
      ? (selectedInventoryItem?.variations ?? []).map((v) => ({
          id: v.id,
          type: v.type,
          value: v.value,
          quantity: (v as { quantity?: number }).quantity ?? 0,
        }))
      : selectedInventoryItem
        ? [
            {
              id: "default",
              type: "Único",
              value: "Único",
              quantity: selectedInventoryItem.quantity ?? 0,
            },
          ]
        : [];
  const selectedVariation = variationsWithQty.find(
    (v) => v.id === formData.variationId,
  );
  const availableQuantity =
    selectedVariation?.quantity ?? selectedInventoryItem?.quantity ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (
      !formData.branchId ||
      !formData.warehouseId ||
      !formData.inventoryBranchId ||
      !formData.variationId
    ) {
      setError("Todos los campos son requeridos");
      return;
    }

    if (formData.quantity <= 0) {
      setError("La cantidad debe ser mayor a 0");
      return;
    }

    if (formData.quantity > availableQuantity) {
      setError("No hay suficiente inventario disponible para esta variación");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        branchId: formData.branchId,
        warehouseId: formData.warehouseId,
        inventoryBranchId: formData.inventoryBranchId,
        variationId: formData.variationId,
        quantity: formData.quantity,
      });
    } catch (err: any) {
      setError(err.message || "Error al retornar inventario");
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
          Sucursal (Origen) *
        </label>
        <div className="relative">
          <select
            value={formData.branchId}
            onChange={(e) =>
              setFormData({
                ...formData,
                branchId: e.target.value,
                inventoryBranchId: "",
              })
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
          Bodega (Destino) *
        </label>
        <div className="relative">
          <select
            value={formData.warehouseId}
            onChange={(e) =>
              setFormData({ ...formData, warehouseId: e.target.value })
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
          Producto *
        </label>
        <div className="relative">
          <select
            value={formData.inventoryBranchId}
            onChange={(e) => {
              const id = e.target.value;
              const item = inventory.find((i) => i.id === id);
              const vars =
                (item?.variations?.length ?? 0) > 0
                  ? (item!.variations ?? []).map((v) => ({
                      id: v.id,
                      type: v.type,
                      value: v.value,
                      quantity: (v as { quantity?: number }).quantity ?? 0,
                    }))
                  : item
                    ? [
                        {
                          id: "default",
                          type: "Único",
                          value: "Único",
                          quantity: item.quantity ?? 0,
                        },
                      ]
                    : [];
              setFormData({
                ...formData,
                inventoryBranchId: id,
                variationId: vars[0]?.id ?? "",
                quantity: 0,
              });
              setQuantityInput("1");
            }}
            required
            disabled={!formData.branchId}
            className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 appearance-none cursor-pointer hover:border-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-500"
          >
            <option value="">Seleccione un producto</option>
            {inventory.map((item) => {
              const variationLabel = getVariationLabel(item);
              return (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {variationLabel ? ` - ${variationLabel}` : ""} (Stock:{" "}
                  {item.quantity})
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
        {inventory.length === 0 && formData.branchId && (
          <p className="text-sm text-gray-500 mt-1">
            No hay productos disponibles en esta sucursal
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Variación *
        </label>
        <div className="relative">
          <select
            value={formData.variationId}
            onChange={(e) => {
              const vid = e.target.value;
              const v = variationsWithQty.find((x) => x.id === vid);
              setFormData({
                ...formData,
                variationId: vid,
                quantity: Math.min(formData.quantity, v?.quantity ?? 0),
              });
              setQuantityInput(
                String(Math.min(formData.quantity, v?.quantity ?? 0)),
              );
            }}
            required
            disabled={!formData.inventoryBranchId}
            className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 appearance-none cursor-pointer hover:border-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-500"
          >
            <option value="">
              {formData.inventoryBranchId
                ? "Seleccione variación"
                : "Seleccione un producto primero"}
            </option>
            {variationsWithQty.map((v) => (
              <option key={v.id} value={v.id}>
                {v.type}: {v.value} — {v.quantity} disponibles
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
        {!formData.variationId && formData.inventoryBranchId && (
          <p className="text-sm text-amber-600 mt-1">
            Debe seleccionar una variación para poder retornar
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
          {loading ? "Retornando..." : "Retornar a Bodega"}
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
