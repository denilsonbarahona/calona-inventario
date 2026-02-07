"use client";

import {
  InventoryWarehouse,
  InventoryBranch,
  InventoryWarehouseRow,
} from "@/types";
import { Package, Trash2 } from "lucide-react";
import { getVariationLabel } from "@/lib/utils/inventoryHelpers";

type InventoryItem =
  | InventoryWarehouse
  | InventoryBranch
  | InventoryWarehouseRow;

interface InventoryTableProps {
  inventory: InventoryItem[];
  type: "warehouse" | "branch";
  /** Si se pasa, se muestra columna Acciones con botón Eliminar. Para filas aplanadas, id es el doc id. */
  onDelete?: (id: string) => void;
}

export default function InventoryTable({
  inventory,
  type,
  onDelete,
}: InventoryTableProps) {
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
              {onDelete && (
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200/50">
            {inventory.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    (type === "warehouse" ? 5 : type === "branch" ? 4 : 3) +
                    (onDelete ? 1 : 0)
                  }
                  className="px-6 py-12 text-center"
                >
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <Package className="text-gray-400" size={24} />
                    </div>
                    <p className="text-gray-500 font-medium">
                      No hay inventario registrado
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              inventory.map((item) => {
                const productName =
                  type === "warehouse"
                    ? (item as InventoryWarehouse | InventoryWarehouseRow).name
                    : (item as InventoryBranch).name;

                const rowKey =
                  "rowId" in item && item.rowId ? item.rowId : item.id;
                let variationLines:
                  | { label: string; quantity: number }[]
                  | null =
                  "variationLines" in item &&
                  Array.isArray(
                    (item as { variationLines?: unknown }).variationLines,
                  )
                    ? (
                        item as {
                          variationLines: { label: string; quantity: number }[];
                        }
                      ).variationLines
                    : null;
                if (
                  type === "branch" &&
                  !variationLines &&
                  "quantity" in item
                ) {
                  const branchItem = item as InventoryBranch;
                  if (branchItem.variations?.length) {
                    variationLines = branchItem.variations.map((v) => ({
                      label: `${v.type}: ${v.value}`,
                      quantity:
                        (v as { quantity?: number }).quantity ??
                        branchItem.quantity,
                    }));
                  } else {
                    variationLines = [
                      {
                        label: getVariationLabel(branchItem) || "Único",
                        quantity: branchItem.quantity,
                      },
                    ];
                  }
                }
                const variationDisplay =
                  !variationLines &&
                  "variationDisplay" in item &&
                  typeof (item as { variationDisplay?: string })
                    .variationDisplay === "string"
                    ? (item as { variationDisplay: string }).variationDisplay
                    : null;
                const variationLabel =
                  !variationLines &&
                  !variationDisplay &&
                  "variation" in item &&
                  item.variation
                    ? getVariationLabel(item as { variation: unknown })
                    : null;
                const variations = item.variations || [];
                const variationValues = variations
                  .map((v) => v.value)
                  .filter(Boolean);
                const variationsText =
                  variationDisplay ||
                  variationLabel ||
                  (variationValues.length > 0
                    ? variationValues.join(" - ")
                    : null);

                return (
                  <tr
                    key={rowKey}
                    className="hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/50 transition-all duration-200 group"
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">
                        {productName}
                      </div>
                      {variationLines && variationLines.length > 0 ? (
                        <div className="text-xs text-gray-500 mt-1 space-y-0.5 font-medium">
                          {variationLines.map((line, i) => (
                            <div key={i}>
                              {line.label} — {line.quantity}
                            </div>
                          ))}
                        </div>
                      ) : (
                        variationsText && (
                          <div className="text-xs text-gray-500 mt-1 font-medium">
                            {variationsText}
                          </div>
                        )
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
                          $
                          {(item as InventoryWarehouse).purchasePrice?.toFixed(
                            2,
                          ) || "0.00"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-600">
                          $
                          {(item as InventoryWarehouse).salePrice?.toFixed(2) ||
                            "0.00"}
                        </td>
                      </>
                    )}
                    {type === "branch" && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-600">
                        $
                        {(item as InventoryBranch).salePrice?.toFixed(2) ||
                          "0.00"}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.lastUpdated instanceof Date
                        ? item.lastUpdated.toLocaleDateString()
                        : new Date(item.lastUpdated).toLocaleDateString()}
                    </td>
                    {onDelete && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onDelete(item.id)}
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 text-sm font-medium"
                          title={
                            type === "warehouse"
                              ? "Eliminar de la bodega"
                              : "Eliminar de la sucursal"
                          }
                        >
                          <Trash2 size={16} />
                          Eliminar
                        </button>
                      </td>
                    )}
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
