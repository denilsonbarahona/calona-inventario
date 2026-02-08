"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { Warehouse, InventoryWarehouse } from "@/types";
import {
  getDocument,
  updateDocument,
  getDocumentsByField,
  createDocument,
  deleteDocument,
} from "@/lib/firebase/firestore";
import {
  canCreateWarehouse,
  canManageProducts,
  canTransferInventory,
} from "@/lib/utils/permissions";
import { convertFirestoreDate } from "@/lib/utils/dateHelpers";
import { normalizeWarehouseDoc } from "@/lib/utils/inventoryHelpers";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import WarehouseProductForm, {
  type WarehouseProductSubmitPayload,
} from "@/app/components/warehouses/WarehouseProductForm";
import WarehouseForm from "@/app/components/warehouses/WarehouseForm";
import { Plus, Package, ArrowRight, Trash2 } from "lucide-react";

export default function WarehouseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { userData } = useAuth();
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [products, setProducts] = useState<InventoryWarehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<InventoryWarehouse | null>(null);
  const [showEditWarehouse, setShowEditWarehouse] = useState(false);

  useEffect(() => {
    // Permitir acceso a admin y manager para ver bodegas y crear productos
    if (
      userData &&
      !canManageProducts(userData.role) &&
      !canCreateWarehouse(userData.role)
    ) {
      router.push("/warehouses");
      return;
    }
    loadWarehouse();
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
    } finally {
      setLoading(false);
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
          const normalized = normalizeWarehouseDoc({
            ...item,
            id: item.id,
          });
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

  const handleUpdateWarehouseInfo = async (
    data: Omit<Warehouse, "id" | "createdAt" | "createdBy">,
  ) => {
    if (!warehouse) return;
    await updateDocument("warehouses", warehouse.id, data);
    await loadWarehouse();
    setShowEditWarehouse(false);
  };

  const handleProductSubmit = async (data: WarehouseProductSubmitPayload) => {
    if (editingProduct) {
      await updateDocument("inventory_warehouse", editingProduct.id, {
        ...data,
        lastUpdated: new Date(),
      });
    } else {
      await createDocument("inventory_warehouse", {
        ...data,
        lastUpdated: new Date(),
      });
    }
    setShowProductForm(false);
    setEditingProduct(null);
    await loadProducts();
  };

  const handleEditProduct = (product: InventoryWarehouse) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleDeleteProduct = async (product: InventoryWarehouse) => {
    const label = product.hasVariations
      ? `${product.name} (y todas sus variaciones)`
      : product.name;
    if (
      !window.confirm(
        `¿Eliminar "${label}" de esta bodega? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    try {
      await deleteDocument("inventory_warehouse", product.id);
      await loadProducts();
    } catch (error) {
      console.error("Error al eliminar producto:", error);
      alert("No se pudo eliminar el producto. Intenta de nuevo.");
    }
  };

  const totalQuantity = (doc: InventoryWarehouse) =>
    (doc.variations ?? []).reduce(
      (sum, v) => sum + (Number(v.quantity) ?? 0),
      0,
    );

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!warehouse) {
    return <div>Bodega no encontrada</div>;
  }

  if (showProductForm) {
    return (
      <div>
        <button
          onClick={() => {
            setShowProductForm(false);
            setEditingProduct(null);
          }}
          className="mb-4 text-purple-600 hover:text-purple-700 flex items-center space-x-2"
        >
          <span>← Volver a bodega</span>
        </button>
        <WarehouseProductForm
          warehouseId={warehouse.id}
          product={editingProduct || undefined}
          onSubmit={handleProductSubmit}
          onCancel={() => {
            setShowProductForm(false);
            setEditingProduct(null);
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">{warehouse.name}</h1>
        <div className="flex items-center space-x-3">
          {userData && canTransferInventory(userData.role) && (
            <Link
              href={`/warehouses/${warehouse.id}/transfer`}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
            >
              <ArrowRight size={20} />
              <span>Transferir a Sucursal</span>
            </Link>
          )}
          {userData && canManageProducts(userData.role) && (
            <button
              onClick={() => setShowProductForm(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
            >
              <Plus size={20} />
              <span>Agregar Producto</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Información de la Bodega
          </h2>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Nombre:</span> {warehouse.name}
            </p>
            {warehouse.address && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">Dirección:</span>{" "}
                {warehouse.address}
              </p>
            )}
          </div>
          {userData && canCreateWarehouse(userData.role) && (
            <button
              onClick={() => setShowEditWarehouse(true)}
              className="mt-4 text-purple-600 hover:text-purple-700 text-sm"
            >
              Editar información
            </button>
          )}
        </div>

        {showEditWarehouse && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Editar información de la bodega
              </h3>
              <WarehouseForm
                warehouse={warehouse}
                onSubmit={handleUpdateWarehouseInfo}
                onCancel={() => setShowEditWarehouse(false)}
              />
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Package className="text-purple-600" size={24} />
            <h2 className="text-lg font-semibold text-gray-700">Productos</h2>
          </div>
          <p className="text-3xl font-bold text-gray-800">{products.length}</p>
          <p className="text-sm text-gray-500">productos registrados</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Inventario Total
          </h2>
          <p className="text-3xl font-bold text-gray-800">
            {products.reduce((sum, doc) => sum + totalQuantity(doc), 0)}
          </p>
          <p className="text-sm text-gray-500">unidades en total</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            Productos en esta bodega
          </h2>
        </div>
        {products.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Package className="mx-auto text-gray-400 mb-2" size={48} />
            <p>No hay productos registrados en esta bodega</p>
            {userData && canManageProducts(userData.role) && (
              <button
                onClick={() => setShowProductForm(true)}
                className="mt-4 text-purple-600 hover:text-purple-700"
              >
                Agregar primer producto
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio Compra
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio Venta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((doc) => {
                  const qty = totalQuantity(doc);
                  const variationsWithQty = doc.variations ?? [];
                  const hasMultiple = variationsWithQty.length > 1;
                  return (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {doc.images && doc.images.length > 0 && (
                            <img
                              src={doc.images[0]}
                              alt={doc.name}
                              className="h-10 w-10 rounded-lg object-cover mr-3"
                            />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {doc.name}
                            </div>
                            {hasMultiple ? (
                              <div className="text-xs text-gray-500 mt-1 space-y-0.5 font-medium">
                                {variationsWithQty.map((v) => (
                                  <div key={v.id}>
                                    {v.type}: {v.value} — {v.quantity ?? 0}
                                  </div>
                                ))}
                              </div>
                            ) : variationsWithQty[0] ? (
                              <div className="text-xs text-gray-500 mt-1 font-medium">
                                {variationsWithQty[0].type}:{" "}
                                {variationsWithQty[0].value} —{" "}
                                {variationsWithQty[0].quantity ?? 0}
                              </div>
                            ) : null}
                            {doc.barcode && (
                              <div className="text-sm text-gray-500 mt-1">
                                Código: {doc.barcode}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {qty}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(doc.purchasePrice ?? 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(doc.salePrice ?? 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {userData && canManageProducts(userData.role) && (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleEditProduct(doc)}
                              className="text-purple-600 hover:text-purple-900"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(doc)}
                              className="text-red-600 hover:text-red-800 flex items-center gap-1"
                              title="Eliminar de la bodega"
                            >
                              <Trash2 size={16} />
                              Eliminar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
