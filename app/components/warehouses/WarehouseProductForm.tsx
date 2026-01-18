"use client";

import { useState } from "react";
import { InventoryWarehouse, ProductVariation } from "@/types";
import ImageUpload from "@/app/components/products/ImageUpload";
import VariationManager from "@/app/components/products/VariationManager";

interface WarehouseProductFormProps {
  warehouseId: string;
  product?: InventoryWarehouse;
  onSubmit: (data: Omit<InventoryWarehouse, "id" | "lastUpdated">) => Promise<void>;
  onCancel: () => void;
}

export default function WarehouseProductForm({
  warehouseId,
  product,
  onSubmit,
  onCancel,
}: WarehouseProductFormProps) {
  const [formData, setFormData] = useState({
    warehouseId: product?.warehouseId || warehouseId,
    name: product?.name || "",
    type: product?.type || "Producto",
    category: product?.category || "",
    taxStatus: product?.taxStatus || "Exento",
    priceIncludesTax: product?.priceIncludesTax !== undefined ? product.priceIncludesTax : true,
    barcode: product?.barcode || "",
    condition: product?.condition || "",
    images: product?.images || [],
    variations: product?.variations || [] as ProductVariation[],
    variationId: product?.variationId || "",
    quantity: product?.quantity || 0,
    purchasePrice: product?.purchasePrice || 0,
    salePrice: product?.salePrice || 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("El nombre es requerido");
      return;
    }

    if (formData.quantity <= 0) {
      setError("La cantidad debe ser mayor a 0");
      return;
    }

    if (formData.purchasePrice <= 0 || formData.salePrice <= 0) {
      setError("Los precios deben ser mayores a 0");
      return;
    }

    setLoading(true);
    try {
      // Preparar datos eliminando valores undefined y campos vacíos opcionales
      const productData: any = {
        warehouseId: formData.warehouseId,
        name: formData.name,
        type: formData.type,
        taxStatus: formData.taxStatus,
        priceIncludesTax: formData.priceIncludesTax,
        images: formData.images,
        variations: formData.variations,
        quantity: formData.quantity,
        purchasePrice: formData.purchasePrice,
        salePrice: formData.salePrice,
      };

      // Solo agregar campos opcionales si tienen valor
      if (formData.category) {
        productData.category = formData.category;
      }
      if (formData.barcode) {
        productData.barcode = formData.barcode;
      }
      if (formData.condition) {
        productData.condition = formData.condition;
      }
      if (formData.variationId) {
        productData.variationId = formData.variationId;
      }

      await onSubmit(productData);
    } catch (err: any) {
      setError(err.message || "Error al guardar producto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          {product ? "Editar producto" : "Nuevo producto"}
        </h2>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Información general</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column - Images */}
            <div className="space-y-4">
              <ImageUpload
                images={formData.images}
                onImagesChange={(images) => setFormData({ ...formData, images })}
              />
            </div>

            {/* Middle Column - Product Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder:text-gray-400"
                  placeholder="Nombre"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de producto
                </label>
                <div className="relative">
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 appearance-none cursor-pointer hover:border-gray-400"
                  >
                    <option value="Producto">Producto</option>
                    <option value="Servicio">Servicio</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
                <div className="relative">
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 appearance-none cursor-pointer hover:border-gray-400"
                  >
                    <option value="">Seleccione una categoría</option>
                    <option value="Electrónica">Electrónica</option>
                    <option value="Ropa">Ropa</option>
                    <option value="Alimentos">Alimentos</option>
                    <option value="Hogar">Hogar</option>
                    <option value="Otros">Otros</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Impuesto gravado
                </label>
                <div className="relative">
                  <select
                    value={formData.taxStatus}
                    onChange={(e) => setFormData({ ...formData, taxStatus: e.target.value })}
                    className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 appearance-none cursor-pointer hover:border-gray-400"
                  >
                    <option value="Exento">Exento</option>
                    <option value="Gravado">Gravado</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ¿El precio incluye el impuesto?
                </label>
                <div className="relative">
                  <select
                    value={formData.priceIncludesTax ? "SI" : "NO"}
                    onChange={(e) =>
                      setFormData({ ...formData, priceIncludesTax: e.target.value === "SI" })
                    }
                    className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 appearance-none cursor-pointer hover:border-gray-400"
                  >
                    <option value="SI">SI</option>
                    <option value="NO">NO</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Creación variación del producto
                </label>
                <VariationManager
                  variations={formData.variations}
                  onVariationsChange={(variations) =>
                    setFormData({ ...formData, variations })
                  }
                />
              </div>

              {formData.variations.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Variación específica (opcional)
                  </label>
                  <select
                    value={formData.variationId}
                    onChange={(e) => setFormData({ ...formData, variationId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                  >
                    <option value="">Sin variación específica</option>
                    {formData.variations.map((variation) => (
                      <option key={variation.id} value={variation.id}>
                        {variation.type}: {variation.value}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Right Column - Pricing and Inventory */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio de compra *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchasePrice}
                    onChange={(e) =>
                      setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })
                    }
                    required
                    min={0}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder:text-gray-400"
                    placeholder="Precio"
                  />
                  <span className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-700">
                    Unidad
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio de venta *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.salePrice}
                    onChange={(e) =>
                      setFormData({ ...formData, salePrice: parseFloat(e.target.value) || 0 })
                    }
                    required
                    min={0}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder:text-gray-400"
                    placeholder="Precio"
                  />
                  <span className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-700">
                    Unidad
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad en inventario *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })
                    }
                    required
                    min={1}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder:text-gray-400"
                    placeholder="Cantidad"
                  />
                  <span className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-700">
                    Unidades
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código de barras
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder:text-gray-400"
                    placeholder="Código de barras"
                  />
                  <span className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-700">
                    Código
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condición del producto
                </label>
                <select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                >
                  <option value="">Seleccione condición</option>
                  <option value="Nuevo">Nuevo</option>
                  <option value="Usado">Usado</option>
                  <option value="Refurbished">Refurbished</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-6 flex space-x-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? "Guardando..." : product ? "Actualizar" : "Registrar producto"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
