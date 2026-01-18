"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { canTransferInventory } from "@/lib/utils/permissions";
import { Warehouse, Branch, InventoryWarehouse } from "@/types";
import {
  getDocument,
  getDocuments,
  getDocumentsByField,
} from "@/lib/firebase/firestore";
import { convertFirestoreDate } from "@/lib/utils/dateHelpers";
import {
  doc,
  collection,
  deleteDoc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Package, ArrowRight, X } from "lucide-react";

interface SelectedProduct {
  inventoryWarehouseId: string;
  name: string;
  quantity: number;
  availableQuantity: number;
  variationId?: string;
}

export default function WarehouseTransferPage() {
  const router = useRouter();
  const params = useParams();
  const { userData } = useAuth();
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<InventoryWarehouse[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
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
        })) as Branch[]
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
        params.id as string
      );
      setProducts(
        data
          .filter((item) => (item.quantity || 0) > 0)
          .map((item) => ({
            ...item,
            lastUpdated: convertFirestoreDate(item.lastUpdated),
          })) as InventoryWarehouse[]
      );
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const addProductToSelection = (product: InventoryWarehouse) => {
    const existingIndex = selectedProducts.findIndex(
      (p) => p.inventoryWarehouseId === product.id
    );
    if (existingIndex >= 0) {
      // Si ya está seleccionado, actualizar cantidad
      const updated = [...selectedProducts];
      updated[existingIndex].quantity = Math.min(
        updated[existingIndex].quantity + 1,
        product.quantity
      );
      setSelectedProducts(updated);
    } else {
      // Agregar nuevo producto
      setSelectedProducts([
        ...selectedProducts,
        {
          inventoryWarehouseId: product.id,
          name: product.name,
          quantity: 1,
          availableQuantity: product.quantity,
          variationId: product.variationId,
        },
      ]);
    }
  };

  const removeProductFromSelection = (inventoryWarehouseId: string) => {
    setSelectedProducts(
      selectedProducts.filter((p) => p.inventoryWarehouseId !== inventoryWarehouseId)
    );
  };

  const updateProductQuantity = (
    inventoryWarehouseId: string,
    quantity: number
  ) => {
    setSelectedProducts(
      selectedProducts.map((p) =>
        p.inventoryWarehouseId === inventoryWarehouseId
          ? { ...p, quantity: Math.min(Math.max(1, quantity), p.availableQuantity) }
          : p
      )
    );
  };

  const handleSubmit = async () => {
    if (!userData || !warehouse || !selectedBranch || selectedProducts.length === 0) {
      setError("Selecciona una sucursal y al menos un producto");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const batch = writeBatch(db);

      // Procesar cada producto seleccionado
      for (const selectedProduct of selectedProducts) {
        const warehouseItem = products.find(
          (p) => p.id === selectedProduct.inventoryWarehouseId
        );

        if (!warehouseItem || warehouseItem.quantity < selectedProduct.quantity) {
          throw new Error(
            `No hay suficiente inventario de ${selectedProduct.name}`
          );
        }

        // Obtener inventario de sucursal para verificar si el producto ya existe
        const branchInventory = await getDocumentsByField(
          "inventory_branch",
          "branchId",
          selectedBranch
        );
        const branchItem = branchInventory.find(
          (item) =>
            item.name === warehouseItem.name &&
            (item.variationId === selectedProduct.variationId ||
              (!item.variationId &&
                !selectedProduct.variationId &&
                !warehouseItem.variationId))
        );

        // Actualizar inventario de bodega (reducir)
        const newWarehouseQuantity = warehouseItem.quantity - selectedProduct.quantity;
        if (newWarehouseQuantity === 0) {
          const warehouseRef = doc(db, "inventory_warehouse", warehouseItem.id);
          await deleteDoc(warehouseRef);
        } else {
          const warehouseRef = doc(db, "inventory_warehouse", warehouseItem.id);
          batch.update(warehouseRef, {
            quantity: newWarehouseQuantity,
            lastUpdated: Timestamp.now(),
          });
        }

        // Actualizar o crear inventario de sucursal (aumentar)
        if (branchItem) {
          const branchRef = doc(db, "inventory_branch", branchItem.id);
          batch.update(branchRef, {
            branchId: selectedBranch, // Asegurar que tenga branchId
            quantity: branchItem.quantity + selectedProduct.quantity,
            lastUpdated: Timestamp.now(),
          });
        } else {
          const branchRef = doc(collection(db, "inventory_branch"));
          batch.set(branchRef, {
            branchId: selectedBranch,
            name: warehouseItem.name,
            productId: warehouseItem.id,
            variationId:
              selectedProduct.variationId || warehouseItem.variationId || null,
            variations: warehouseItem.variations || [],
            barcode: warehouseItem.barcode || null,
            quantity: selectedProduct.quantity,
            purchasePrice: warehouseItem.purchasePrice,
            salePrice: warehouseItem.salePrice,
            lastUpdated: Timestamp.now(),
          });
        }

        // Crear registro de transferencia
        const transferRef = doc(collection(db, "transfers"));
        batch.set(transferRef, {
          warehouseId: warehouse.id,
          branchId: selectedBranch,
          inventoryWarehouseId: warehouseItem.id,
          variationId: selectedProduct.variationId || null,
          quantity: selectedProduct.quantity,
          direction: "warehouse_to_branch",
          transferredBy: userData.id,
          transferredAt: Timestamp.now(),
        });
      }

      await batch.commit();
      router.push(`/warehouses/${warehouse.id}`);
    } catch (error: any) {
      setError(error.message || "Error al transferir inventario");
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
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Productos Disponibles en {warehouse.name}
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {products.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No hay productos disponibles en esta bodega
                </p>
              ) : (
                products.map((product) => {
                  const variation = product.variationId
                    ? product.variations?.find((v) => v.id === product.variationId)
                    : null;
                  const isSelected = selectedProducts.some(
                    (p) => p.inventoryWarehouseId === product.id
                  );
                  return (
                    <div
                      key={product.id}
                      className={`border rounded-lg p-3 ${
                        isSelected
                          ? "border-purple-500 bg-purple-50"
                          : "hover:border-gray-400"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            {product.images && product.images.length > 0 && (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="h-10 w-10 rounded object-cover"
                              />
                            )}
                            <div>
                              <p className="font-medium text-gray-900">
                                {product.name}
                              </p>
                              {variation && (
                                <p className="text-sm text-gray-600">
                                  {variation.type}: {variation.value}
                                </p>
                              )}
                              <p className="text-sm text-gray-500">
                                Stock: {product.quantity} unidades
                              </p>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => addProductToSelection(product)}
                          disabled={isSelected || product.quantity === 0}
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
                const product = products.find(
                  (p) => p.id === selectedProduct.inventoryWarehouseId
                );
                return (
                  <div
                    key={selectedProduct.inventoryWarehouseId}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {selectedProduct.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          Disponible: {selectedProduct.availableQuantity} unidades
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          removeProductFromSelection(
                            selectedProduct.inventoryWarehouseId
                          )
                        }
                        className="text-red-600 hover:text-red-700"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-700">Cantidad:</label>
                      <input
                        type="number"
                        min={1}
                        max={selectedProduct.availableQuantity}
                        value={selectedProduct.quantity}
                        onChange={(e) =>
                          updateProductQuantity(
                            selectedProduct.inventoryWarehouseId,
                            parseInt(e.target.value) || 1
                          )
                        }
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
                    {selectedProducts.reduce(
                      (sum, p) => sum + p.quantity,
                      0
                    )}{" "}
                    unidades
                  </span>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={
                    loading ||
                    !selectedBranch ||
                    selectedProducts.length === 0
                  }
                  className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <ArrowRight size={20} />
                  <span>
                    {loading
                      ? "Transferiendo..."
                      : `Transferir a ${branches.find((b) => b.id === selectedBranch)?.name || "Sucursal"}`}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
