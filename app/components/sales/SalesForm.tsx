"use client";

import { useState, useEffect } from "react";
import { InventoryBranch } from "@/types";
import { getDocumentsByField, getDocuments } from "@/lib/firebase/firestore";
import { convertFirestoreDate } from "@/lib/utils/dateHelpers";
import { Search, ShoppingCart, X, Plus, Minus } from "lucide-react";

interface SalesFormProps {
  branchId: string;
  onSubmit: (data: {
    inventoryBranchId: string;
    quantity: number;
  }) => Promise<void>;
}

interface CartItem {
  inventoryBranchId: string;
  quantity: number;
  name: string;
  variation?: string;
  unitPrice: number;
  purchasePrice: number;
  availableStock: number;
}

export default function SalesForm({ branchId, onSubmit }: SalesFormProps) {
  const [allInventory, setAllInventory] = useState<InventoryBranch[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryBranch[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (branchId) {
      loadInventory();
    }
  }, [branchId]);

  const loadInventory = async () => {
    if (!branchId) return;

    try {
      // Primero intentar obtener por branchId
      let data = await getDocumentsByField("inventory_branch", "branchId", branchId);
      
      // Si no encuentra nada, obtener todos y usar transferencias para identificar
      if (data.length === 0) {
        const allItems = await getDocuments("inventory_branch");
        const transfers = await getDocumentsByField("transfers", "branchId", branchId);
        const inventoryBranchIdsFromTransfers = new Set(
          transfers.map(t => t.inventoryBranchId).filter(Boolean)
        );
        
        data = allItems.filter(item => 
          inventoryBranchIdsFromTransfers.has(item.id)
        );
        
        // Actualizar items sin branchId
        if (data.length > 0) {
          const { doc, writeBatch, Timestamp } = await import("firebase/firestore");
          const { db } = await import("@/lib/firebase/config");
          const batch = writeBatch(db);
          
          for (const item of data) {
            if (!item.branchId) {
              const itemRef = doc(db, "inventory_branch", item.id);
              batch.update(itemRef, {
                branchId: branchId,
                lastUpdated: Timestamp.now(),
              });
            }
          }
          
          await batch.commit();
        }
      }
      
      const inventoryItems = data
        .filter((item) => (item.quantity || 0) > 0)
        .map((item) => ({
          ...item,
          branchId: item.branchId || branchId,
          lastUpdated: convertFirestoreDate(item.lastUpdated),
        })) as InventoryBranch[];

      setAllInventory(inventoryItems);
    } catch (error) {
      console.error("Error al cargar inventario:", error);
      alert("Error al cargar el inventario");
    }
  };

  // Filtrar productos cuando se escribe en el buscador
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredInventory([]);
      return;
    }

    const searchLower = searchTerm.toLowerCase().trim();
    const filtered = allInventory.filter((item) => {
      const nameMatch = item.name?.toLowerCase().includes(searchLower) || false;
      const barcodeMatch = item.barcode?.toLowerCase().includes(searchLower) || false;
      return nameMatch || barcodeMatch;
    });

    setFilteredInventory(filtered);
  }, [searchTerm, allInventory]);

  const addToCart = () => {
    if (!selectedProductId || quantity <= 0) return;

    const product = allInventory.find((item) => item.id === selectedProductId);
    if (!product) return;

    if (product.quantity < quantity) {
      alert(`No hay suficiente stock. Disponible: ${product.quantity}`);
      return;
    }

    // Verificar si ya está en el carrito
    const existingIndex = cart.findIndex(
      (item) => item.inventoryBranchId === selectedProductId
    );

    const variation = product.variationId
      ? product.variations?.find((v) => v.id === product.variationId)
      : null;

    const cartItem: CartItem = {
      inventoryBranchId: product.id,
      quantity,
      name: product.name,
      variation: variation ? `${variation.type}: ${variation.value}` : undefined,
      unitPrice: product.salePrice || 0,
      purchasePrice: product.purchasePrice || 0,
      availableStock: product.quantity,
    };

    if (existingIndex >= 0) {
      // Actualizar cantidad si ya existe
      const updatedCart = [...cart];
      const newQuantity = updatedCart[existingIndex].quantity + quantity;
      if (newQuantity > updatedCart[existingIndex].availableStock) {
        alert(`No hay suficiente stock. Disponible: ${updatedCart[existingIndex].availableStock}`);
        return;
      }
      updatedCart[existingIndex].quantity = newQuantity;
      setCart(updatedCart);
    } else {
      // Agregar nuevo item
      setCart([...cart, cartItem]);
    }

    // Reset
    setSelectedProductId(null);
    setQuantity(1);
    setSearchTerm("");
    setFilteredInventory([]);
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
      alert(`No hay suficiente stock. Disponible: ${updatedCart[index].availableStock}`);
      return;
    }
    updatedCart[index].quantity = newQuantity;
    setCart(updatedCart);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert("El carrito está vacío");
      return;
    }

    setLoading(true);
    try {
      for (const item of cart) {
        await onSubmit({
          inventoryBranchId: item.inventoryBranchId,
          quantity: item.quantity,
        });
      }
      setCart([]);
      setSelectedProductId(null);
      setQuantity(1);
      setSearchTerm("");
      setFilteredInventory([]);
      await loadInventory();
      alert("Venta realizada exitosamente");
    } catch (error: any) {
      alert(error.message || "Error al realizar la venta");
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = selectedProductId
    ? allInventory.find((item) => item.id === selectedProductId)
    : null;

  const total = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Panel izquierdo - Búsqueda y selección */}
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Buscar Producto</h2>

          {/* Buscador */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o código de barras..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder:text-gray-400"
            />
          </div>

          {/* Lista de productos filtrados (solo se muestra cuando hay búsqueda) */}
          {searchTerm.trim() && (
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg mb-4">
              {filteredInventory.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No se encontraron productos</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredInventory.map((item) => {
                    const variation = item.variationId
                      ? item.variations?.find((v) => v.id === item.variationId)
                      : null;

                    const variations = item.variations || [];
                    const variationValues = variations.map((v) => v.value).filter(Boolean);
                    const variationsText = variationValues.length > 0 ? variationValues.join(" - ") : null;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedProductId(item.id)}
                        className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                          selectedProductId === item.id ? "bg-purple-50 border-l-4 border-purple-500" : ""
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{item.name}</p>
                            {variationsText && (
                              <p className="text-xs text-gray-500 mt-1">{variationsText}</p>
                            )}
                            {variation && (
                              <p className="text-sm text-gray-600 mt-1">
                                {variation.type}: {variation.value}
                              </p>
                            )}
                            {item.barcode && (
                              <p className="text-xs text-gray-400 mt-1">Código: {item.barcode}</p>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <p className="font-bold text-lg text-purple-600">
                              ${(item.salePrice || 0).toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">Stock: {item.quantity}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Producto seleccionado y cantidad */}
          {selectedProduct && (
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="mb-3">
                <p className="font-semibold text-gray-900">{selectedProduct.name}</p>
                <p className="text-sm text-gray-600">
                  Precio: ${(selectedProduct.salePrice || 0).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">Disponible: {selectedProduct.quantity} unidades</p>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setQuantity(Math.min(Math.max(1, val), selectedProduct.quantity));
                  }}
                  min={1}
                  max={selectedProduct.quantity}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                />
                <button
                  type="button"
                  onClick={addToCart}
                  disabled={quantity <= 0 || quantity > selectedProduct.quantity}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Agregar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Panel derecho - Carrito y resumen */}
      <div>
        <div className="bg-white rounded-lg shadow p-6 sticky top-4">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart size={24} className="text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-800">Productos Seleccionados</h2>
            {cart.length > 0 && (
              <span className="ml-auto bg-purple-100 text-purple-600 px-2 py-1 rounded-full text-sm font-semibold">
                {cart.length}
              </span>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <ShoppingCart size={48} className="mx-auto mb-2 opacity-50" />
              <p>No hay productos seleccionados</p>
              <p className="text-sm mt-2">Busca y selecciona productos en el panel izquierdo</p>
            </div>
          ) : (
            <>
              {/* Lista de productos en el carrito */}
              <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
                {cart.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900">{item.name}</p>
                        {item.variation && (
                          <p className="text-xs text-gray-500 mt-1">{item.variation}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          ${item.unitPrice.toFixed(2)} c/u
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(index)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(index, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100"
                      >
                        <Minus size={16} />
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          updateCartQuantity(index, val);
                        }}
                        min={1}
                        max={item.availableStock}
                        className="w-16 px-2 py-1 text-center border border-gray-300 rounded text-sm text-gray-900"
                      />
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(index, item.quantity + 1)}
                        disabled={item.quantity >= item.availableStock}
                        className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus size={16} />
                      </button>
                      <span className="ml-auto font-semibold text-gray-900">
                        ${(item.unitPrice * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Resumen y botón de venta */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold text-gray-800">Total:</span>
                  <span className="text-2xl font-bold text-purple-600">${total.toFixed(2)}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={loading || cart.length === 0}
                  className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                >
                  {loading ? "Procesando..." : "Realizar Venta"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
