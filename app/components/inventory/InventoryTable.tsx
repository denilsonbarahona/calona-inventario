"use client";

import { InventoryWarehouse, InventoryBranch } from "@/types";
import { Package } from "lucide-react";

interface InventoryTableProps {
  inventory: (InventoryWarehouse | InventoryBranch)[];
  type: "warehouse" | "branch";
}

export default function InventoryTable({ inventory, type }: InventoryTableProps) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200/50">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Producto
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Cantidad
              </th>
            {type === "warehouse" && (
              <>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Precio Compra
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Precio Venta
                </th>
              </>
            )}
            {type === "branch" && (
              <>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Precio Venta
                </th>
              </>
            )}
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
              Última actualización
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200/50">
          {inventory.length === 0 ? (
            <tr>
              <td
                colSpan={type === "warehouse" ? 5 : type === "branch" ? 4 : 3}
                className="px-6 py-12 text-center"
              >
                <div className="flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Package className="text-gray-400" size={24} />
                  </div>
                  <p className="text-gray-500 font-medium">No hay inventario registrado</p>
                </div>
              </td>
            </tr>
          ) : (
            inventory.map((item) => {
              const productName =
                type === "warehouse"
                  ? (item as InventoryWarehouse).name
                  : (item as InventoryBranch).name;
              
              // Obtener todas las variaciones del producto
              const variations = item.variations || [];
              const variationValues = variations.map((v) => v.value).filter(Boolean);
              const variationsText = variationValues.length > 0 
                ? variationValues.join(" - ")
                : null;

              return (
                <tr key={item.id} className="hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/50 transition-all duration-200 group">
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-gray-900">{productName}</div>
                    {variationsText && (
                      <div className="text-xs text-gray-400 mt-1 font-medium">{variationsText}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-indigo-100 text-indigo-800">
                      {item.quantity}
                    </span>
                  </td>
                  {type === "warehouse" && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-700">
                        ${(item as InventoryWarehouse).purchasePrice?.toFixed(2) || "0.00"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-600">
                        ${(item as InventoryWarehouse).salePrice?.toFixed(2) || "0.00"}
                      </td>
                    </>
                  )}
                  {type === "branch" && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-600">
                      ${(item as InventoryBranch).salePrice?.toFixed(2) || "0.00"}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.lastUpdated instanceof Date
                      ? item.lastUpdated.toLocaleDateString()
                      : new Date(item.lastUpdated).toLocaleDateString()}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
