"use client";

import { useState, useEffect } from "react";
import { ProductVariation } from "@/types";
import { Plus, X, Trash2 } from "lucide-react";

interface VariationManagerProps {
  variations: ProductVariation[];
  onVariationsChange: (variations: ProductVariation[]) => void;
}

interface VariationRow {
  id: string;
  type: string;
  value: string;
  sku: string;
}

export default function VariationManager({
  variations,
  onVariationsChange,
}: VariationManagerProps) {
  const [rows, setRows] = useState<VariationRow[]>([]);

  // Inicializar filas desde las variaciones existentes
  useEffect(() => {
    if (variations.length > 0) {
      setRows(
        variations.map((v) => ({
          id: v.id,
          type: v.type,
          value: v.value,
          sku: v.sku || "",
        }))
      );
    } else {
      // Agregar una fila vacía inicial
      setRows([
        {
          id: Date.now().toString(),
          type: "",
          value: "",
          sku: "",
        },
      ]);
    }
  }, []);

  // Sincronizar cambios de filas con las variaciones
  const syncVariations = (updatedRows: VariationRow[]) => {
    const validVariations = updatedRows
      .filter((row) => row.type && row.value)
      .map((row) => ({
        id: row.id,
        type: row.type,
        value: row.value,
        sku: row.sku || undefined,
      }));

    onVariationsChange(validVariations);
  };

  const updateRow = (id: string, field: keyof VariationRow, value: string) => {
    const updatedRows = rows.map((row) =>
      row.id === id ? { ...row, [field]: value } : row
    );
    setRows(updatedRows);
    syncVariations(updatedRows);
  };

  const addRow = () => {
    const newRow: VariationRow = {
      id: Date.now().toString(),
      type: "",
      value: "",
      sku: "",
    };
    setRows([...rows, newRow]);
  };

  const removeRow = (id: string) => {
    if (rows.length === 1) {
      // Si solo hay una fila, solo limpiarla
      setRows([
        {
          id: Date.now().toString(),
          type: "",
          value: "",
          sku: "",
        },
      ]);
      onVariationsChange([]);
    } else {
      const updatedRows = rows.filter((row) => row.id !== id);
      setRows(updatedRows);
      syncVariations(updatedRows);
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-800 mb-1">
          Variaciones del producto
        </label>
        <p className="text-xs text-gray-500">
          Agrega variaciones como talla, color, tamaño, etc.
        </p>
      </div>

      {/* Grid de variaciones */}
      <div className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Headers de columnas */}
        <div className="grid grid-cols-12 gap-4 bg-gray-50 px-4 py-3 border-b border-gray-200">
          <div className="col-span-4">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Tipo *
            </label>
          </div>
          <div className="col-span-4">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Valor *
            </label>
          </div>
          <div className="col-span-3">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              SKU (opcional)
            </label>
          </div>
          <div className="col-span-1"></div>
        </div>

        {/* Filas de variaciones */}
        <div className="divide-y divide-gray-200">
          {rows.map((row, index) => (
            <div key={row.id} className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
              {/* Tipo */}
              <div className="col-span-4">
                <div className="relative">
                  <select
                    value={row.type}
                    onChange={(e) => updateRow(row.id, "type", e.target.value)}
                    className="w-full pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-sm text-gray-900 appearance-none cursor-pointer hover:border-gray-400"
                  >
                    <option value="">Seleccione tipo</option>
                    <option value="talla">Talla</option>
                    <option value="color">Color</option>
                    <option value="tamaño">Tamaño</option>
                    <option value="otro">Otro</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Valor */}
              <div className="col-span-4">
                <input
                  type="text"
                  value={row.value}
                  onChange={(e) => updateRow(row.id, "value", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 placeholder:text-gray-400 transition-all duration-200"
                  placeholder="Ej: M, Rojo, Grande"
                />
              </div>

              {/* SKU */}
              <div className="col-span-3">
                <input
                  type="text"
                  value={row.sku}
                  onChange={(e) => updateRow(row.id, "sku", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 placeholder:text-gray-400 transition-all duration-200 font-mono"
                  placeholder="Código SKU"
                />
              </div>

              {/* Botón eliminar */}
              <div className="col-span-1 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors duration-200"
                  title="Eliminar fila"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Botón agregar fila */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors duration-200 shadow-sm hover:shadow"
          >
            <Plus size={16} />
            <span>Agregar fila</span>
          </button>
        </div>
      </div>
    </div>
  );
}
