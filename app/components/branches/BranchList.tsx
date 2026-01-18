"use client";

import { Branch } from "@/types";
import Link from "next/link";
import { Trash2, Edit, Package } from "lucide-react";

interface BranchListProps {
  branches: Branch[];
  onDelete: (id: string) => void;
  canEdit?: boolean;
}

export default function BranchList({ branches, onDelete, canEdit = true }: BranchListProps) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200/50">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Dirección
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Fecha de creación
              </th>
              {canEdit && (
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200/50">
            {branches.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 4 : 3} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <Package className="text-gray-400" size={24} />
                    </div>
                    <p className="text-gray-500 font-medium">No hay sucursales registradas</p>
                  </div>
                </td>
              </tr>
            ) : (
              branches.map((branch) => (
                <tr key={branch.id} className="hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/50 transition-all duration-200 group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/branches/${branch.id}`}
                      className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors group-hover:underline"
                    >
                      {branch.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {branch.address || <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {branch.createdAt instanceof Date
                      ? branch.createdAt.toLocaleDateString()
                      : new Date(branch.createdAt).toLocaleDateString()}
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-3">
                        <Link
                          href={`/branches/${branch.id}`}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200"
                        >
                          <Edit size={18} />
                        </Link>
                        <button
                          onClick={() => {
                            if (confirm("¿Estás seguro de eliminar esta sucursal?")) {
                              onDelete(branch.id);
                            }
                          }}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200"
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
    </div>
  );
}
