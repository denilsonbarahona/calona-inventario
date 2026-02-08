"use client";

import { useState, useMemo } from "react";
import { Search, ShoppingCart, X, Plus, Minus } from "lucide-react";
import { toast } from "react-toastify";
import { useInventoryBranch } from "@/lib/hooks/useInventory";
import { useCreateSales } from "@/lib/hooks/useSales";
import {
  getVariationLabel,
  getQuantityByVariationBranch,
  getVariationLabelById,
} from "@/lib/utils/inventoryHelpers";
import { formatCurrency } from "@/lib/utils/formatCurrency";

interface SalesFormProps {
  branchId: string;
  userId: string;
  onSaleComplete?: () => void;
}

interface CartItem {
  inventoryBranchId: string;
  variationId: string;
  quantity: number;
  name: string;
  variation?: string;
  unitPrice: number;
  purchasePrice: number;
  availableStock: number;
}

export default function SalesForm({
  branchId,
  userId,
  onSaleComplete,
}: SalesFormProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const [selectedVariationId, setSelectedVariationId] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [quantityInput, setQuantityInput] = useState<string>("1");

  // Usar React Query para cargar inventario
  const {
    data: allInventory = [],
    isLoading: isLoadingInventory,
    error: inventoryError,
    refetch: refetchInventory,
  } = useInventoryBranch({
    branchId,
    enabled: !!branchId,
  });

  // Debug: Log del inventario cargado
  useMemo(() => {
    if (allInventory.length > 0) {
      console.log(
        "✅ SalesForm: Inventario cargado:",
        allInventory.length,
        "productos",
      );
    } else if (!isLoadingInventory && branchId) {
      console.warn(
        "⚠️ SalesForm: No se encontraron productos para branchId:",
        branchId,
      );
    }
  }, [allInventory, isLoadingInventory, branchId]);

  // Filtrar solo productos con stock > 0 (base para búsqueda y lista)
  const availableInventory = useMemo(() => {
    return allInventory.filter((item) => (item.quantity || 0) > 0);
  }, [allInventory]);

  // Búsqueda por contains: nombre, código de barras, SKU o etiqueta de variación (nunca por igualdad)
  const filteredInventory = useMemo(() => {
    const term = searchTerm.trim();
    if (!term) {
      return availableInventory;
    }
    const searchLower = term.toLowerCase();
    return availableInventory.filter((item) => {
      const nameMatch = (item.name ?? "").toLowerCase().includes(searchLower);
      const barcodeMatch = (item.barcode ?? "")
        .toLowerCase()
        .includes(searchLower);
      const variationLabel = getVariationLabel(item) ?? "";
      const variationMatch = variationLabel.toLowerCase().includes(searchLower);
      const skuMatch = (item.variations ?? []).some((v) =>
        ((v as { sku?: string }).sku ?? "").toLowerCase().includes(searchLower),
      );
      return nameMatch || barcodeMatch || variationMatch || skuMatch;
    });
  }, [searchTerm, availableInventory]);

  const addToCart = () => {
    if (!selectedProductId || !selectedVariationId || quantity <= 0) return;

    const product = availableInventory.find(
      (item) => item.id === selectedProductId,
    );
    if (!product) return;

    const variationStock = getQuantityByVariationBranch(
      product,
      selectedVariationId,
    );
    if (variationStock < quantity) {
      toast.warning(
        `No hay suficiente stock para esta variación. Disponible: ${variationStock}`,
      );
      return;
    }

    const existingIndex = cart.findIndex(
      (item) =>
        item.inventoryBranchId === selectedProductId &&
        item.variationId === selectedVariationId,
    );

    const cartItem: CartItem = {
      inventoryBranchId: product.id,
      variationId: selectedVariationId,
      quantity,
      name: product.name,
      variation:
        getVariationLabelById(product, selectedVariationId) || undefined,
      unitPrice: product.salePrice || 0,
      purchasePrice: product.purchasePrice || 0,
      availableStock: variationStock,
    };

    if (existingIndex >= 0) {
      const updatedCart = [...cart];
      const newQuantity = updatedCart[existingIndex].quantity + quantity;
      if (newQuantity > updatedCart[existingIndex].availableStock) {
        toast.warning(
          `No hay suficiente stock. Disponible: ${updatedCart[existingIndex].availableStock}`,
        );
        return;
      }
      updatedCart[existingIndex].quantity = newQuantity;
      setCart(updatedCart);
    } else {
      setCart([...cart, cartItem]);
    }

    setSelectedProductId(null);
    setSelectedVariationId("");
    setQuantity(1);
    setQuantityInput("1");
    setSearchTerm("");
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const updateCartQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(index);
      return;
    }

    const updatedCart = [...cart];
    if (newQuantity > updatedCart[index].availableStock) {
      toast.warning(
        `No hay suficiente stock. Disponible: ${updatedCart[index].availableStock}`,
      );
      return;
    }
    updatedCart[index].quantity = newQuantity;
    setCart(updatedCart);
  };

  // Hook para crear ventas en lote (un batch por checkout)
  const { mutate: createSales, isPending: isCreatingSale } = useCreateSales({
    onSuccess: () => {
      setCart([]);
      setSelectedProductId(null);
      setQuantity(1);
      setSearchTerm("");
      refetchInventory();
      onSaleComplete?.();
    },
  });

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.warning("El carrito está vacío");
      return;
    }

    createSales({
      branchId,
      userId,
      items: cart.map((item) => ({
        inventoryBranchId: item.inventoryBranchId,
        variationId: item.variationId,
        quantity: item.quantity,
      })),
    });
  };

  const selectedProduct = useMemo(() => {
    return selectedProductId
      ? availableInventory.find((item) => item.id === selectedProductId)
      : null;
  }, [selectedProductId, availableInventory]);

  const variationsWithQtyForSelected = useMemo(() => {
    if (!selectedProduct) return [];
    const vars = selectedProduct.variations?.length
      ? (selectedProduct.variations ?? []).map((v) => ({
          id: v.id,
          type: v.type,
          value: v.value,
          quantity: (v as { quantity?: number }).quantity ?? 0,
        }))
      : [
          {
            id: "default",
            type: "default",
            value: "Único",
            quantity: selectedProduct.quantity ?? 0,
          },
        ];
    return vars.filter((v) => v.quantity > 0);
  }, [selectedProduct]);

  const availableQuantityForVariation =
    selectedProduct && selectedVariationId
      ? getQuantityByVariationBranch(selectedProduct, selectedVariationId)
      : 0;

  const total = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 h-[calc(100vh-12rem)]">
      {/* Panel izquierdo - Búsqueda y selección */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100/50 p-4 lg:p-6 flex flex-col">
        <h2 className="text-lg lg:text-xl font-bold text-gray-800 mb-4">
          Buscar Producto
        </h2>

        <div className="relative mb-4">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, código, SKU o variación..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm text-gray-900 placeholder:text-gray-400"
          />
        </div>

        {/* Mensaje de error */}
        {inventoryError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              Error al cargar inventario:{" "}
              {inventoryError instanceof Error
                ? inventoryError.message
                : "Error desconocido"}
            </p>
          </div>
        )}

        {/* Mensaje cuando no hay productos en la sucursal */}
        {!isLoadingInventory &&
          !inventoryError &&
          allInventory.length === 0 &&
          !searchTerm.trim() && (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 mb-4">
              <Search size={48} className="mb-4 opacity-50" />
              <p className="text-sm font-medium">
                No hay productos en esta sucursal
              </p>
              <p className="text-xs mt-2">
                Busca productos o contacta al administrador
              </p>
            </div>
          )}

        {/* Lista de productos: con búsqueda vacía se muestran todos los disponibles; con texto se filtra por contains (nombre, código, variación) */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {isLoadingInventory ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
              <p className="text-sm">Cargando productos...</p>
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Search size={48} className="mb-4 opacity-50" />
              <p className="text-sm">
                {searchTerm.trim()
                  ? "No se encontraron productos"
                  : "No hay productos con stock en esta sucursal"}
              </p>
              <p className="text-xs mt-2">
                {searchTerm.trim()
                  ? "Se busca por nombre, código o variación (contiene el texto)"
                  : "Contacta al administrador para agregar inventario"}
              </p>
            </div>
          ) : (
            filteredInventory.map((item) => {
              const variationLabel = getVariationLabel(item);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    const vars =
                      (item.variations?.length ?? 0) > 0
                        ? (item.variations ?? []).map((v) => ({
                            id: v.id,
                            quantity:
                              (v as { quantity?: number }).quantity ?? 0,
                          }))
                        : [{ id: "default", quantity: item.quantity ?? 0 }];
                    const firstWithStock = vars.find((v) => v.quantity > 0);
                    setSelectedProductId(item.id);
                    setSelectedVariationId(
                      firstWithStock?.id ?? vars[0]?.id ?? "default",
                    );
                    setQuantity(1);
                    setQuantityInput("1");
                  }}
                  disabled={isLoadingInventory || item.quantity <= 0}
                  className={`w-full p-3 text-left bg-gray-50 hover:bg-indigo-50 rounded-lg transition-all duration-200 border border-gray-200 hover:border-indigo-300 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                    selectedProductId === item.id
                      ? "bg-indigo-50 border-indigo-300"
                      : ""
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-900 mb-1">
                        {item.name}
                      </p>
                      {variationLabel && (
                        <p className="text-xs text-gray-500 mb-1">
                          {variationLabel}
                        </p>
                      )}
                      {item.barcode && (
                        <p className="text-xs text-gray-400">
                          Código: {item.barcode}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-bold text-sm text-indigo-600">
                        {formatCurrency(item.salePrice || 0)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Stock: {item.quantity}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Producto seleccionado, variación y cantidad */}
        {selectedProduct && (
          <div className="mt-auto p-4 bg-indigo-50/50 rounded-lg border border-indigo-200/50">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <p className="font-semibold text-sm text-gray-900">
                  {selectedProduct.name}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Precio: {formatCurrency(selectedProduct.salePrice || 0)}
                </p>
                <p className="text-xs text-gray-600">
                  Disponible: {availableQuantityForVariation} unidades
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedProductId(null);
                  setSelectedVariationId("");
                  setQuantity(1);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors ml-2"
                title="Deseleccionar producto"
              >
                <X size={18} />
              </button>
            </div>

            {variationsWithQtyForSelected.length > 0 && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Variación *
                </label>
                <select
                  value={selectedVariationId}
                  onChange={(e) => {
                    const vid = e.target.value;
                    setSelectedVariationId(vid);
                    const qty = getQuantityByVariationBranch(
                      selectedProduct,
                      vid,
                    );
                    const newQty = Math.min(quantity, qty);
                    setQuantity(newQty);
                    setQuantityInput(String(newQty));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900"
                >
                  {variationsWithQtyForSelected.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.type}: {v.value} — {v.quantity} disponibles
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={quantityInput}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || /^\d+$/.test(value)) {
                    setQuantityInput(value);
                    if (value !== "") {
                      const val = parseInt(value, 10);
                      if (!isNaN(val)) {
                        const maxQuantity = availableQuantityForVariation;
                        const finalVal = Math.min(
                          Math.max(1, val),
                          maxQuantity,
                        );
                        setQuantity(finalVal);
                        if (val > maxQuantity) {
                          setQuantityInput(maxQuantity.toString());
                        }
                      }
                    }
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value === "") {
                    setQuantityInput("1");
                    setQuantity(1);
                  } else {
                    setQuantityInput(quantity.toString());
                  }
                }}
                onFocus={(e) => e.target.select()}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900"
              />
              <button
                type="button"
                onClick={addToCart}
                disabled={
                  quantity <= 0 ||
                  !selectedVariationId ||
                  quantity > availableQuantityForVariation
                }
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                Agregar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Panel derecho - Carrito y resumen */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100/50 p-4 lg:p-6 flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart size={20} className="text-indigo-600" />
          <h2 className="text-lg lg:text-xl font-bold text-gray-800">
            Productos Seleccionados
          </h2>
          {cart.length > 0 && (
            <span className="ml-auto bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full text-xs font-semibold">
              {cart.length}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <ShoppingCart size={48} className="mb-4 opacity-50" />
              <p className="text-sm">No hay productos seleccionados</p>
              <p className="text-xs mt-2">Busca y selecciona productos</p>
            </div>
          ) : (
            <div className="space-y-2 mb-4">
              {cart.map((item, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50/80 rounded-lg border border-gray-200/50 hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-900">
                        {item.name}
                      </p>
                      {item.variation && (
                        <p className="text-xs text-gray-500 mt-1">
                          {item.variation}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {formatCurrency(item.unitPrice)} c/u
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(index)}
                      className="text-red-500 hover:text-red-700 ml-2"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateCartQuantity(index, item.quantity - 1)
                      }
                      className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100 text-xs text-gray-900"
                    >
                      <Minus size={14} className="text-gray-900" />
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={
                        cart[index].quantity === 0
                          ? ""
                          : cart[index].quantity.toString()
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        // Permitir valores vacíos y solo números
                        if (value === "" || /^\d+$/.test(value)) {
                          if (value === "") {
                            // Permitir que quede vacío temporalmente
                            const updatedCart = [...cart];
                            updatedCart[index] = {
                              ...updatedCart[index],
                              quantity: 0,
                            };
                            setCart(updatedCart);
                          } else {
                            const val = parseInt(value, 10);
                            if (!isNaN(val)) {
                              // Validar que no exceda el máximo disponible
                              const finalVal = Math.min(
                                Math.max(1, val),
                                item.availableStock,
                              );
                              updateCartQuantity(index, finalVal);
                            }
                          }
                        }
                      }}
                      onBlur={(e) => {
                        // Si está vacío al perder el foco, restaurar a 1
                        if (
                          e.target.value === "" ||
                          cart[index].quantity === 0
                        ) {
                          updateCartQuantity(index, 1);
                        }
                      }}
                      onFocus={(e) => {
                        // Seleccionar todo el texto al hacer focus para facilitar reemplazo
                        e.target.select();
                      }}
                      className="w-14 px-2 py-1 text-center border border-gray-300 rounded text-xs text-gray-900"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateCartQuantity(index, item.quantity + 1)
                      }
                      disabled={item.quantity >= item.availableStock}
                      className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs text-gray-900"
                    >
                      <Plus size={14} className="text-gray-900" />
                    </button>
                    <span className="ml-auto font-semibold text-sm text-gray-900">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resumen y botón de venta */}
        {cart.length > 0 && (
          <div className="border-t border-gray-200/50 pt-4 mt-auto">
            <div className="flex justify-between items-center mb-4">
              <span className="text-base font-semibold text-gray-800">
                Total:
              </span>
              <span className="text-xl font-bold text-indigo-600">
                {formatCurrency(total)}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCheckout}
              disabled={isCreatingSale || cart.length === 0}
              className="w-full py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold text-sm"
            >
              {isCreatingSale ? "Procesando..." : "Realizar Venta"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
