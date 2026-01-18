"use client";

import { useState } from "react";
import { ProductVariation } from "@/types";
import { Plus, X } from "lucide-react";

interface VariationManagerProps {
  variations: ProductVariation[];
  onVariationsChange: (variations: ProductVariation[]) => void;
}

export default function VariationManager({
  variations,
  onVariationsChange,
}: VariationManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: "",
    value: "",
    sku: "",
  });

  const addVariation = () => {
    if (!formData.type || !formData.value) return;

    const newVariation: ProductVariation = {
      id: Date.now().toString(),
      type: formData.type,
      value: formData.value,
      sku: formData.sku || undefined,
    };

    onVariationsChange([...variations, newVariation]);
    setFormData({ type: "", value: "", sku: "" });
    setShowForm(false);
  };

  const removeVariation = (id: string) => {
    onVariationsChange(variations.filter((v) => v.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium text-gray-700">
          Variaciones del producto
        </label>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-purple-600 hover:text-purple-700 text-sm flex items-center space-x-1"
          >
            <Plus size={16} />
            <span>Agregar variación</span>
          </button>
        )}
      </div>

      {variations.length > 0 && (
        <div className="space-y-2">
          {variations.map((variation) => (
            <div
              key={variation.id}
              className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
            >
              <div>
                <span className="font-medium">{variation.type}:</span> {variation.value}
                {variation.sku && <span className="text-gray-500 ml-2">(SKU: {variation.sku})</span>}
              </div>
              <button
                type="button"
                onClick={() => removeVariation(variation.id)}
                className="text-red-600 hover:text-red-700"
              >
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="border border-gray-300 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
            <div className="relative">
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full pl-3 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 appearance-none cursor-pointer hover:border-gray-400"
              >
                <option value="">Seleccione tipo</option>
                <option value="talla">Talla</option>
                <option value="color">Color</option>
                <option value="tamaño">Tamaño</option>
                <option value="otro">Otro</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
            <input
              type="text"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder:text-gray-400"
              placeholder="Ej: M, Rojo, Grande"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU (opcional)</label>
            <input
              type="text"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder:text-gray-400"
              placeholder="Código SKU"
            />
          </div>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={addVariation}
              className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700"
            >
              Agregar
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setFormData({ type: "", value: "", sku: "" });
              }}
              className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
