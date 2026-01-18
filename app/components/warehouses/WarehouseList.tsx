"use client";

import { Warehouse } from "@/types";
import Link from "next/link";
import { Trash2, Edit } from "lucide-react";

interface WarehouseListProps {
  warehouses: Warehouse[];
  onDelete: (id: string) => void;
  canEdit?: boolean;
}

export default function WarehouseList({ warehouses, onDelete, canEdit = true }: WarehouseListProps) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Nombre
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Dirección
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fecha de creación
            </th>
            {canEdit && (
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {warehouses.length === 0 ? (
            <tr>
              <td colSpan={canEdit ? 4 : 3} className="px-6 py-4 text-center text-gray-500">
                No hay bodegas registradas
              </td>
            </tr>
          ) : (
            warehouses.map((warehouse) => (
              <tr key={warehouse.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    href={`/warehouses/${warehouse.id}`}
                    className="text-sm font-medium text-purple-600 hover:text-purple-800"
                  >
                    {warehouse.name}
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {warehouse.address || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {warehouse.createdAt instanceof Date
                    ? warehouse.createdAt.toLocaleDateString()
                    : new Date(warehouse.createdAt).toLocaleDateString()}
                </td>
                {canEdit && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Link
                        href={`/warehouses/${warehouse.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit size={18} />
                      </Link>
                      <button
                        onClick={() => {
                          if (confirm("¿Estás seguro de eliminar esta bodega?")) {
                            onDelete(warehouse.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
