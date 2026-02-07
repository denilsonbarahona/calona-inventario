"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { canTransferInventory } from "@/lib/utils/permissions";
import { Warehouse, Branch, InventoryWarehouse } from "@/types";
import type { ProductVariation } from "@/types";
import {
  getDocument,
  getDocuments,
  getDocumentsByField,
} from "@/lib/firebase/firestore";
import { convertFirestoreDate } from "@/lib/utils/dateHelpers";
import {
  getVariationLabel,
  getDisplayVariation,
  getQuantityByVariation,
  flattenWarehouseProduct,
  normalizeWarehouseDoc,
} from "@/lib/utils/inventoryHelpers";
import type { InventoryWarehouseRow } from "@/types";
import { doc, collection, writeBatch, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Package, ArrowRight, X } from "lucide-react";

function selectionKey(productId: string, variationId: string) {
  return `${productId}_${variationId}`;
}

interface SelectedProduct {
  inventoryWarehouseId: string;
  variationId: string;
  variation: ProductVariation;
  name: string;
  quantity: number;
  availableQuantity: number;
}

export default function WarehouseTransferPage() {
  const router = useRouter();
  const params = useParams();
  const { userData } = useAuth();
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<InventoryWarehouse[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>(
    [],
  );
  const [quantityInputs, setQuantityInputs] = useState<Record<string, string>>(
    {},
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (userData && !canTransferInventory(userData.role)) {
      router.push("/warehouses");
      return;
    }
    loadWarehouse();
    loadBranches();
    loadProducts();
  }, [params.id, userData, router]);

  const loadWarehouse = async () => {
    try {
      const data = await getDocument("warehouses", params.id as string);
      if (data) {
        setWarehouse({
          ...data,
          createdAt: convertFirestoreDate(data.createdAt),
        } as Warehouse);
      }
    } catch (error) {
      console.error("Error loading warehouse:", error);
    }
  };

  const loadBranches = async () => {
    try {
      const data = await getDocuments("branches");
      setBranches(
        data.map((b) => ({
          ...b,
          createdAt: convertFirestoreDate(b.createdAt),
        })) as Branch[],
      );
    } catch (error) {
      console.error("Error loading branches:", error);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await getDocumentsByField(
        "inventory_warehouse",
        "warehouseId",
        params.id as string,
      );
      setProducts(
        data.map((item) => {
          const normalized = normalizeWarehouseDoc({ ...item, id: item.id });
          return {
            ...normalized,
            lastUpdated: convertFirestoreDate(item.lastUpdated as unknown),
          } as InventoryWarehouse;
        }),
      );
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const productRows: InventoryWarehouseRow[] = products
    .flatMap((d) =>
      flattenWarehouseProduct({
        ...d,
        lastUpdated:
          d.lastUpdated instanceof Date
            ? d.lastUpdated
            : new Date(d.lastUpdated as Date),
      }),
    )
    .filter((row) => row.quantity > 0);

  const addProductToSelection = (row: InventoryWarehouseRow) => {
    const key = selectionKey(row.id, row.variation.id);
    const existingIndex = selectedProducts.findIndex(
      (p) => selectionKey(p.inventoryWarehouseId, p.variationId) === key,
    );
    if (existingIndex >= 0) {
      const updated = [...selectedProducts];
      const newQuantity = Math.min(
        updated[existingIndex].quantity + 1,
        row.quantity,
      );
      updated[existingIndex].quantity = newQuantity;
      setSelectedProducts(updated);
      setQuantityInputs((prev) => ({ ...prev, [key]: newQuantity.toString() }));
    } else {
      setSelectedProducts([
        ...selectedProducts,
        {
          inventoryWarehouseId: row.id,
          variationId: row.variation.id,
          variation: row.variation,
          name: row.name,
          quantity: 1,
          availableQuantity: row.quantity,
        },
      ]);
      setQuantityInputs((prev) => ({ ...prev, [key]: "1" }));
    }
  };

  const removeProductFromSelection = (key: string) => {
    setSelectedProducts(
      selectedProducts.filter(
        (p) => selectionKey(p.inventoryWarehouseId, p.variationId) !== key,
      ),
    );
    setQuantityInputs((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const updateProductQuantity = (key: string, quantity: number) => {
    setSelectedProducts(
      selectedProducts.map((p) => {
        if (selectionKey(p.inventoryWarehouseId, p.variationId) !== key)
          return p;
        return {
          ...p,
          quantity: Math.min(Math.max(1, quantity), p.availableQuantity),
        };
      }),
    );
    setQuantityInputs((prev) => ({ ...prev, [key]: quantity.toString() }));
  };

  const handleSubmit = async () => {
    if (
      !userData ||
      !warehouse ||
      !selectedBranch ||
      selectedProducts.length === 0
    ) {
      setError("Selecciona una sucursal y al menos un producto");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const batch = writeBatch(db);
      /** Cantidades pendientes por doc de bodega (para un solo update por doc). */
      const pendingQuantitiesByDocId: Record<
        string,
        Record<string, number>
      > = {};
      const warehouseDocIdsUpdated = new Set<string>();

      /** Un doc por producto en sucursal: productId → { existingId?, name, variations[], ... }. Se fusionan variaciones al transferir. */
      interface BranchPending {
        existingId?: string;
        name: string;
        productId: string;
        variations: {
          id: string;
          type: string;
          value: string;
          sku?: string;
          quantity: number;
        }[];
        purchasePrice: number;
        salePrice: number;
        barcode?: string | null;
      }
      const pendingBranchByProductId: Record<string, BranchPending> = {};

      const branchInventory = await getDocumentsByField(
        "inventory_branch",
        "branchId",
        selectedBranch,
      );

      for (const selectedProduct of selectedProducts) {
        const warehouseDoc = products.find(
          (p) => p.id === selectedProduct.inventoryWarehouseId,
        );
        if (!warehouseDoc) {
          throw new Error(`Producto no encontrado: ${selectedProduct.name}`);
        }
        const currentQty = getQuantityByVariation(
          warehouseDoc,
          selectedProduct.variationId,
        );
        if (currentQty < selectedProduct.quantity) {
          throw new Error(
            `No hay suficiente inventario de ${selectedProduct.name}`,
          );
        }

        if (!pendingQuantitiesByDocId[warehouseDoc.id]) {
          pendingQuantitiesByDocId[warehouseDoc.id] = {};
          warehouseDoc.variations?.forEach((v) => {
            pendingQuantitiesByDocId[warehouseDoc.id][v.id] = v.quantity ?? 0;
          });
        }
        const pending = pendingQuantitiesByDocId[warehouseDoc.id];
        const newQty = Math.max(
          0,
          (pending[selectedProduct.variationId] ?? 0) -
            selectedProduct.quantity,
        );
        pending[selectedProduct.variationId] = newQty;
        if (newQty === 0) {
          delete pending[selectedProduct.variationId];
        }
        warehouseDocIdsUpdated.add(warehouseDoc.id);

        const productId = warehouseDoc.id;
        let branchPending = pendingBranchByProductId[productId];
        if (!branchPending) {
          const existing = branchInventory.find(
            (item) => item.productId === productId,
          );
          let existingVariations: {
            id: string;
            type: string;
            value: string;
            sku?: string;
            quantity: number;
          }[] = [];
          if (existing?.variations?.length) {
            existingVariations = existing.variations.map(
              (v: {
                id: string;
                type: string;
                value: string;
                sku?: string;
                quantity?: number;
              }) => ({
                id: v.id,
                type: v.type,
                value: v.value,
                sku: v.sku,
                quantity: v.quantity ?? 0,
              }),
            );
          } else if (existing?.variation) {
            const v = getDisplayVariation(existing);
            if (v)
              existingVariations = [
                {
                  id: v.id,
                  type: v.type,
                  value: v.value,
                  sku: v.sku,
                  quantity: existing.quantity ?? 0,
                },
              ];
          }
          branchPending = {
            existingId: existing?.id,
            name: warehouseDoc.name,
            productId,
            variations: existingVariations,
            purchasePrice: warehouseDoc.purchasePrice,
            salePrice: warehouseDoc.salePrice,
            barcode: warehouseDoc.barcode ?? null,
          };
          pendingBranchByProductId[productId] = branchPending;
        }

        const idx = branchPending.variations.findIndex(
          (v) => v.id === selectedProduct.variationId,
        );
        if (idx >= 0) {
          branchPending.variations[idx].quantity += selectedProduct.quantity;
        } else {
          const v = selectedProduct.variation;
          branchPending.variations.push({
            id: v.id,
            type: v.type,
            value: v.value,
            ...(v.sku != null && v.sku !== "" ? { sku: v.sku } : {}),
            quantity: selectedProduct.quantity,
          });
        }

        const transferRef = doc(collection(db, "transfers"));
        batch.set(transferRef, {
          warehouseId: warehouse.id,
          branchId: selectedBranch,
          inventoryWarehouseId: warehouseDoc.id,
          variationId: selectedProduct.variationId,
          quantity: selectedProduct.quantity,
          direction: "warehouse_to_branch",
          transferredBy: userData.id,
          transferredAt: Timestamp.now(),
        });
      }

      const variationsForFirestore = (
        variations: {
          id: string;
          type: string;
          value: string;
          sku?: string | null;
          quantity: number;
        }[],
      ) =>
        variations.map((v) => ({
          id: v.id,
          type: v.type,
          value: v.value,
          quantity: v.quantity,
          ...(v.sku != null && v.sku !== "" ? { sku: v.sku } : {}),
        }));

      for (const productId of Object.keys(pendingBranchByProductId)) {
        const branchPending = pendingBranchByProductId[productId];
        const totalQty = branchPending.variations.reduce(
          (sum, v) => sum + v.quantity,
          0,
        );
        const variationsPayload = variationsForFirestore(
          branchPending.variations,
        );
        if (branchPending.existingId) {
          const branchRef = doc(
            db,
            "inventory_branch",
            branchPending.existingId,
          );
          batch.update(branchRef, {
            variations: variationsPayload,
            quantity: totalQty,
            lastUpdated: Timestamp.now(),
          });
        } else {
          const branchRef = doc(collection(db, "inventory_branch"));
          batch.set(branchRef, {
            branchId: selectedBranch,
            name: branchPending.name,
            productId: branchPending.productId,
            variations: variationsPayload,
            barcode: branchPending.barcode ?? null,
            quantity: totalQty,
            purchasePrice: branchPending.purchasePrice,
            salePrice: branchPending.salePrice,
            lastUpdated: Timestamp.now(),
          });
        }
      }

      for (const docId of warehouseDocIdsUpdated) {
        const warehouseDoc = products.find((p) => p.id === docId);
        if (!warehouseDoc) continue;
        const pending = pendingQuantitiesByDocId[docId] ?? {};
        const newVariations = (warehouseDoc.variations ?? []).map((v) => ({
          ...v,
          quantity: pending[v.id] ?? 0,
        }));
        const warehouseRef = doc(db, "inventory_warehouse", docId);
        batch.update(warehouseRef, {
          variations: newVariations,
          lastUpdated: Timestamp.now(),
        });
      }

      await batch.commit();
      router.push(`/warehouses/${warehouse.id}`);
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "Error al transferir inventario",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!warehouse) {
    return <div>Cargando...</div>;
  }

  return (
    <div>
      <div className="flex items-center space-x-2 mb-6">
        <button
          onClick={() => router.push(`/warehouses/${warehouse.id}`)}
          className="text-purple-600 hover:text-purple-700"
        >
          ← Volver a {warehouse.name}
        </button>
      </div>

      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Transferir Productos a Sucursal
      </h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel izquierdo: Selección de sucursal y productos */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Seleccionar Sucursal
            </h2>
            <div className="relative">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
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

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Productos Disponibles en {warehouse.name}
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {productRows.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No hay productos disponibles en esta bodega
                </p>
              ) : (
                productRows.map((row) => {
                  const variationLabel = getVariationLabel(row);
                  const key = selectionKey(row.id, row.variation.id);
                  const isSelected = selectedProducts.some(
                    (p) =>
                      selectionKey(p.inventoryWarehouseId, p.variationId) ===
                      key,
                  );
                  return (
                    <div
                      key={row.rowId}
                      className={`border rounded-lg p-3 ${
                        isSelected
                          ? "border-purple-500 bg-purple-50"
                          : "hover:border-gray-400"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            {row.images && row.images.length > 0 && (
                              <img
                                src={row.images[0]}
                                alt={row.name}
                                className="h-10 w-10 rounded object-cover"
                              />
                            )}
                            <div>
                              <p className="font-medium text-gray-900">
                                {row.name}
                              </p>
                              {variationLabel && (
                                <p className="text-sm text-gray-600">
                                  {variationLabel}
                                </p>
                              )}
                              <p className="text-sm text-gray-500">
                                Stock: {row.quantity} unidades
                              </p>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => addProductToSelection(row)}
                          disabled={isSelected || row.quantity === 0}
                          className="ml-4 px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                        >
                          {isSelected ? "Seleccionado" : "Agregar"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Panel derecho: Productos seleccionados */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Productos a Transferir
          </h2>
          {selectedProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="mx-auto text-gray-400 mb-2" size={48} />
              <p>No hay productos seleccionados</p>
              <p className="text-sm mt-2">
                Selecciona productos del panel izquierdo
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedProducts.map((selectedProduct) => {
                const key = selectionKey(
                  selectedProduct.inventoryWarehouseId,
                  selectedProduct.variationId,
                );
                const variationLabel = getVariationLabel(selectedProduct);
                return (
                  <div
                    key={key}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {selectedProduct.name}
                        </p>
                        {variationLabel && (
                          <p className="text-sm font-medium text-purple-600 mt-0.5">
                            Variación: {variationLabel}
                          </p>
                        )}
                        <p className="text-sm text-gray-500">
                          Disponible: {selectedProduct.availableQuantity}{" "}
                          unidades
                        </p>
                      </div>
                      <button
                        onClick={() => removeProductFromSelection(key)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-700">Cantidad:</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={
                          quantityInputs[key] ??
                          selectedProduct.quantity.toString()
                        }
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "" || /^\d+$/.test(value)) {
                            setQuantityInputs((prev) => ({
                              ...prev,
                              [key]: value,
                            }));
                            if (value !== "") {
                              const val = parseInt(value, 10);
                              if (!isNaN(val)) {
                                const maxQty =
                                  selectedProduct.availableQuantity;
                                const finalVal = Math.min(
                                  Math.max(1, val),
                                  maxQty,
                                );
                                updateProductQuantity(key, finalVal);
                                if (val > maxQty) {
                                  setQuantityInputs((prev) => ({
                                    ...prev,
                                    [key]: maxQty.toString(),
                                  }));
                                }
                              }
                            }
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target.value === "") {
                            setQuantityInputs((prev) => ({
                              ...prev,
                              [key]: "1",
                            }));
                            updateProductQuantity(key, 1);
                          } else {
                            setQuantityInputs((prev) => ({
                              ...prev,
                              [key]: selectedProduct.quantity.toString(),
                            }));
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-gray-900"
                      />
                      <span className="text-sm text-gray-500">unidades</span>
                    </div>
                  </div>
                );
              })}

              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-semibold text-gray-800">
                    Total de productos:
                  </span>
                  <span className="font-bold text-gray-900">
                    {selectedProducts.length}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-semibold text-gray-800">
                    Total de unidades:
                  </span>
                  <span className="font-bold text-gray-900">
                    {selectedProducts.reduce((sum, p) => sum + p.quantity, 0)}{" "}
                    unidades
                  </span>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={
                    loading || !selectedBranch || selectedProducts.length === 0
                  }
                  className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <ArrowRight size={20} />
                  {loading
                    ? "Transferiendo..."
                    : `Transferir a ${branches.find((b) => b.id === selectedBranch)?.name || "Sucursal"}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
