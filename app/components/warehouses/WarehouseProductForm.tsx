"use client";

import { useState, useEffect } from "react";
import {
  InventoryWarehouse,
  ProductVariation,
  ProductVariationWithQuantity,
  Category,
} from "@/types";
import { getDocuments } from "@/lib/firebase/firestore";
import ImageUpload from "@/app/components/products/ImageUpload";
import VariationManager from "@/app/components/products/VariationManager";

const DEFAULT_VARIATION: ProductVariation = {
  id: "default",
  type: "Único",
  value: "Único",
};

export type WarehouseProductSubmitPayload = Omit<
  InventoryWarehouse,
  "id" | "lastUpdated"
>;

interface WarehouseProductFormProps {
  warehouseId: string;
  product?: InventoryWarehouse;
  onSubmit: (data: WarehouseProductSubmitPayload) => Promise<void>;
  onCancel: () => void;
}

interface VariationQuantity {
  variation: ProductVariation;
  quantity: number;
}

export default function WarehouseProductForm({
  warehouseId,
  product,
  onSubmit,
  onCancel,
}: WarehouseProductFormProps) {
  const [formData, setFormData] = useState(() => {
    const variations: ProductVariation[] = product?.variations?.length
      ? product.variations.map((v) => ({
          id: v.id,
          type: v.type,
          value: v.value,
          sku: v.sku,
        }))
      : (product as InventoryWarehouse & { variation?: ProductVariation })
            ?.variation
        ? [
            (product as InventoryWarehouse & { variation: ProductVariation })
              .variation,
          ]
        : [DEFAULT_VARIATION];
    const defaultQty =
      product?.variations?.find((v) => v.id === "default")?.quantity ??
      (
        product as InventoryWarehouse & {
          variationQuantities?: Record<string, number>;
        }
      )?.variationQuantities?.["default"] ??
      (product as InventoryWarehouse & { quantity?: number })?.quantity ??
      0;
    return {
      warehouseId: product?.warehouseId || warehouseId,
      name: product?.name || "",
      type: product?.type || "Producto",
      category: product?.category || "",
      taxStatus: product?.taxStatus || "Exento",
      priceIncludesTax:
        product?.priceIncludesTax !== undefined
          ? product.priceIncludesTax
          : true,
      barcode: product?.barcode || "",
      condition: product?.condition || "",
      images: product?.images || [],
      variations,
      quantity: defaultQty,
      purchasePrice: product?.purchasePrice || 0,
      salePrice: product?.salePrice || 0,
    };
  });
  const [variationQuantities, setVariationQuantities] = useState<
    VariationQuantity[]
  >(() => {
    if (product?.variations?.length) {
      return product.variations.map((v) => ({
        variation: {
          id: v.id,
          type: v.type,
          value: v.value,
          sku: v.sku,
        },
        quantity: (v as ProductVariationWithQuantity).quantity ?? 0,
      }));
    }
    if (
      (product as InventoryWarehouse & { variation?: ProductVariation })
        ?.variation
    ) {
      const p = product as InventoryWarehouse & {
        variation: ProductVariation;
        quantity?: number;
      };
      return [{ variation: p.variation, quantity: p.quantity ?? 0 }];
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  /** Valores mostrados en los inputs de cantidad por variación (como en transferir/venta). */
  const [quantityInputByVariationId, setQuantityInputByVariationId] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getDocuments("categories");
        setCategories(
          data.map((c) => ({ id: c.id, name: c.name || "" })) as Category[],
        );
      } catch (e) {
        console.error("Error loading categories:", e);
      }
    };
    load();
  }, []);

  // Sincronizar variationQuantities con las variaciones que NO son "default".
  // Solo añadimos/quitamos filas por id; preservamos cantidades existentes por id.
  useEffect(() => {
    if (product) return;
    const vars = formData.variations.filter(
      (v) => v.type && v.value && v.id !== "default",
    );
    setVariationQuantities((prev) => {
      const byId = new Map(prev.map((p) => [p.variation.id, p]));
      return vars.map((v) => ({
        variation: v,
        quantity: byId.get(v.id)?.quantity ?? 0,
      }));
    });
  }, [formData.variations, product]);

  const buildBasePayload = (): Omit<
    WarehouseProductSubmitPayload,
    "hasVariations" | "variations"
  > => {
    const base = {
      warehouseId: formData.warehouseId,
      name: formData.name,
      type: formData.type,
      taxStatus: formData.taxStatus,
      priceIncludesTax: formData.priceIncludesTax,
      images: formData.images,
      purchasePrice: formData.purchasePrice,
      salePrice: formData.salePrice,
    } as Omit<WarehouseProductSubmitPayload, "hasVariations" | "variations">;
    if (formData.category)
      (base as Record<string, unknown>).category = formData.category;
    if (formData.barcode)
      (base as Record<string, unknown>).barcode = formData.barcode;
    if (formData.condition)
      (base as Record<string, unknown>).condition = formData.condition;
    return base;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("El nombre es requerido");
      return;
    }
    if (formData.purchasePrice <= 0 || formData.salePrice <= 0) {
      setError("Los precios deben ser mayores a 0");
      return;
    }

    const hasVars =
      formData.variations.filter((v) => v.type && v.value && v.id !== "default")
        .length > 0;

    setLoading(true);
    try {
      let payload: WarehouseProductSubmitPayload;
      if (hasVars) {
        const valid = variationQuantities.filter(
          (vq) => vq.variation.type && vq.variation.value,
        );
        if (valid.length === 0) {
          setError("Agrega al menos una variación con tipo y valor.");
          setLoading(false);
          return;
        }
        const withQty = valid.filter((vq) => vq.quantity > 0);
        if (withQty.length === 0 && !product) {
          setError(
            "Indica la cantidad en inventario para al menos una variación.",
          );
          setLoading(false);
          return;
        }
        const toUse = product ? valid : withQty.length > 0 ? withQty : valid;
        const hasDefaultInForm = formData.variations.some(
          (v) => v.id === "default",
        );
        const variationsWithQuantity: ProductVariationWithQuantity[] =
          toUse.map((vq) => {
            const formVar = formData.variations.find(
              (v) => v.id === vq.variation.id,
            );
            const variation = formVar ?? vq.variation;
            return {
              id: variation.id,
              type: variation.type,
              value: variation.value,
              ...(variation.sku != null && variation.sku !== ""
                ? { sku: variation.sku }
                : {}),
              quantity: Math.max(0, vq.quantity),
            };
          });
        if (hasDefaultInForm) {
          const existing = variationsWithQuantity.find(
            (v) => v.id === "default",
          );
          if (existing) {
            existing.quantity = Math.max(0, formData.quantity);
          } else {
            const defaultFormVar = formData.variations.find(
              (v) => v.id === "default",
            );
            const defaultVariation = defaultFormVar ?? DEFAULT_VARIATION;
            variationsWithQuantity.push({
              id: "default",
              type: defaultVariation.type,
              value: defaultVariation.value,
              ...(defaultVariation.sku != null && defaultVariation.sku !== ""
                ? { sku: defaultVariation.sku }
                : {}),
              quantity: Math.max(0, formData.quantity),
            });
          }
        }
        payload = {
          ...buildBasePayload(),
          hasVariations: true,
          variations: variationsWithQuantity,
        };
      } else {
        if (formData.quantity < 0) {
          setError("La cantidad debe ser mayor o igual a 0");
          setLoading(false);
          return;
        }
        const singleVariation =
          formData.variations.find((v) => v.type && v.value) ??
          DEFAULT_VARIATION;
        payload = {
          ...buildBasePayload(),
          hasVariations: false,
          variations: [
            {
              ...singleVariation,
              id: "default",
              quantity: Math.max(0, formData.quantity),
            },
          ],
        };
      }
      await onSubmit(payload);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al guardar producto",
      );
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
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Información general
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column - Images */}
            <div className="space-y-4">
              <ImageUpload
                images={formData.images}
                onImagesChange={(images) =>
                  setFormData({ ...formData, images })
                }
              />
            </div>

            {/* Middle Column - Product Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
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
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 appearance-none cursor-pointer hover:border-gray-400"
                  >
                    <option value="Producto">Producto</option>
                    <option value="Servicio">Servicio</option>
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
                  Categoría
                </label>
                <div className="relative">
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 appearance-none cursor-pointer hover:border-gray-400"
                  >
                    <option value="">Seleccione una categoría</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
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
            </div>

            {/* Right Column - Pricing and Inventory */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio de compra *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.purchasePrice || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Permitir valores vacíos y números con decimales
                      if (value === "" || /^\d*\.?\d*$/.test(value)) {
                        setFormData({
                          ...formData,
                          purchasePrice:
                            value === "" ? 0 : parseFloat(value) || 0,
                        });
                      }
                    }}
                    onBlur={(e) => {
                      // Si está vacío al perder el foco, restaurar a 0
                      if (e.target.value === "") {
                        setFormData({ ...formData, purchasePrice: 0 });
                      }
                    }}
                    required
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder:text-gray-400"
                    placeholder="Precio"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio de venta *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.salePrice || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Permitir valores vacíos y números con decimales
                      if (value === "" || /^\d*\.?\d*$/.test(value)) {
                        setFormData({
                          ...formData,
                          salePrice: value === "" ? 0 : parseFloat(value) || 0,
                        });
                      }
                    }}
                    onBlur={(e) => {
                      // Si está vacío al perder el foco, restaurar a 0
                      if (e.target.value === "") {
                        setFormData({ ...formData, salePrice: 0 });
                      }
                    }}
                    required
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder:text-gray-400"
                    placeholder="Precio"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condición del producto
                </label>
                <select
                  value={formData.condition}
                  onChange={(e) =>
                    setFormData({ ...formData, condition: e.target.value })
                  }
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

          {/* Sección de variaciones - Ocupa todo el ancho */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <VariationManager
              variations={formData.variations}
              onVariationsChange={(variations) =>
                setFormData({ ...formData, variations })
              }
            />
            {/* Stock por variación: una fila por cada variación (incluye la única si renombraron "Único") */}
            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Stock por variación *
              </label>
              <p className="text-xs text-gray-500 mb-3">
                La cantidad va ligada a cada variación. Si cambias el tipo/valor
                de la variación única arriba, aquí se refleja igual.
              </p>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-12 gap-4 bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <div className="col-span-6 text-xs font-semibold text-gray-700 uppercase">
                    Variación
                  </div>
                  <div className="col-span-4 text-xs font-semibold text-gray-700 uppercase">
                    Cantidad
                  </div>
                  <div className="col-span-2" />
                </div>
                {(formData.variations.filter((v) => v.type && v.value).length >
                0
                  ? formData.variations.filter((v) => v.type && v.value)
                  : [DEFAULT_VARIATION]
                ).map((variation) => {
                  const quantity =
                    variation.id === "default"
                      ? formData.quantity
                      : (variationQuantities.find(
                          (p) => p.variation.id === variation.id,
                        )?.quantity ?? 0);
                  const inputValue =
                    quantityInputByVariationId[variation.id] ??
                    String(quantity);
                  return (
                    <div
                      key={variation.id}
                      className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-100 last:border-0 items-center"
                    >
                      <div className="col-span-6 text-sm text-gray-900 capitalize">
                        {variation.type}: {variation.value}
                      </div>
                      <div className="col-span-4">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={inputValue}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value !== "" && !/^\d+$/.test(value)) return;
                            setQuantityInputByVariationId((prev) => ({
                              ...prev,
                              [variation.id]: value,
                            }));
                            if (value !== "") {
                              const val = Math.max(0, parseInt(value, 10) || 0);
                              if (variation.id === "default") {
                                setFormData({ ...formData, quantity: val });
                              } else {
                                setVariationQuantities((prev) => {
                                  const existing = prev.find(
                                    (p) => p.variation.id === variation.id,
                                  );
                                  if (existing)
                                    return prev.map((p) =>
                                      p.variation.id === variation.id
                                        ? { ...p, quantity: val }
                                        : p,
                                    );
                                  return [
                                    ...prev,
                                    {
                                      variation: { ...variation },
                                      quantity: val,
                                    },
                                  ];
                                });
                              }
                            }
                          }}
                          onBlur={(e) => {
                            if (e.target.value === "") {
                              setQuantityInputByVariationId((prev) => ({
                                ...prev,
                                [variation.id]: "0",
                              }));
                              if (variation.id === "default") {
                                setFormData({ ...formData, quantity: 0 });
                              } else {
                                setVariationQuantities((prev) => {
                                  const existing = prev.find(
                                    (p) => p.variation.id === variation.id,
                                  );
                                  if (existing)
                                    return prev.map((p) =>
                                      p.variation.id === variation.id
                                        ? { ...p, quantity: 0 }
                                        : p,
                                    );
                                  return [
                                    ...prev,
                                    {
                                      variation: { ...variation },
                                      quantity: 0,
                                    },
                                  ];
                                });
                              }
                            } else {
                              const finalVal = Math.max(
                                0,
                                parseInt(e.target.value, 10) || 0,
                              );
                              setQuantityInputByVariationId((prev) => ({
                                ...prev,
                                [variation.id]: String(finalVal),
                              }));
                            }
                          }}
                          onFocus={(e) => e.target.select()}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 text-gray-900"
                        />
                      </div>
                      <div className="col-span-2" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-6 flex space-x-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading
                ? "Guardando..."
                : product
                  ? "Actualizar"
                  : "Registrar producto"}
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
