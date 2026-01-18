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
} from "@/lib/firebase/firestore";
import { canCreateWarehouse, canManageProducts, canTransferInventory } from "@/lib/utils/permissions";
import { convertFirestoreDate } from "@/lib/utils/dateHelpers";
import WarehouseProductForm from "@/app/components/warehouses/WarehouseProductForm";
import { Plus, Package, ArrowRight } from "lucide-react";

export default function WarehouseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { userData } = useAuth();
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [products, setProducts] = useState<InventoryWarehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryWarehouse | null>(null);

  useEffect(() => {
    // Permitir acceso a admin y manager para ver bodegas y crear productos
    if (userData && !canManageProducts(userData.role) && !canCreateWarehouse(userData.role)) {
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
      const data = await getDocumentsByField("inventory_warehouse", "warehouseId", params.id as string);
      setProducts(
        data.map((item) => ({
          ...item,
          lastUpdated: convertFirestoreDate(item.lastUpdated),
        })) as InventoryWarehouse[]
      );
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const handleUpdate = async (data: any) => {
    if (!warehouse) return;

    await updateDocument("warehouses", warehouse.id, data);
    router.push("/warehouses");
  };

  const handleProductSubmit = async (data: Omit<InventoryWarehouse, "id" | "lastUpdated">) => {
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
    loadProducts();
  };

  const handleEditProduct = (product: InventoryWarehouse) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

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
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Información de la Bodega</h2>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Nombre:</span> {warehouse.name}
            </p>
            {warehouse.address && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">Dirección:</span> {warehouse.address}
              </p>
            )}
          </div>
          <button
            onClick={() => {
              const form = document.createElement("form");
              form.style.display = "none";
              document.body.appendChild(form);
              // This will be handled by a modal or separate page
            }}
            className="mt-4 text-purple-600 hover:text-purple-700 text-sm"
          >
            Editar información
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Package className="text-purple-600" size={24} />
            <h2 className="text-lg font-semibold text-gray-700">Productos</h2>
          </div>
          <p className="text-3xl font-bold text-gray-800">{products.length}</p>
          <p className="text-sm text-gray-500">productos registrados</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Inventario Total</h2>
          <p className="text-3xl font-bold text-gray-800">
            {products.reduce((sum, p) => sum + (p.quantity || 0), 0)}
          </p>
          <p className="text-sm text-gray-500">unidades en total</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Productos en esta bodega</h2>
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
                {products.map((product) => {
                  // Obtener todas las variaciones del producto
                  const variations = product.variations || [];
                  const variationValues = variations.map((v) => v.value).filter(Boolean);
                  const variationsText = variationValues.length > 0 
                    ? variationValues.join(" - ")
                    : null;

                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {product.images && product.images.length > 0 && (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="h-10 w-10 rounded-lg object-cover mr-3"
                            />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            {variationsText && (
                              <div className="text-xs text-gray-400 mt-1">{variationsText}</div>
                            )}
                            {product.barcode && (
                              <div className="text-sm text-gray-500 mt-1">Código: {product.barcode}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${product.purchasePrice?.toFixed(2) || "0.00"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${product.salePrice?.toFixed(2) || "0.00"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {userData && canManageProducts(userData.role) && (
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="text-purple-600 hover:text-purple-900"
                          >
                            Editar
                          </button>
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
