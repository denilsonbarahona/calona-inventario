"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { Category } from "@/types";
import {
  getDocuments,
  createDocument,
  deleteDocument,
  updateDocument,
} from "@/lib/firebase/firestore";
import { canManageProducts } from "@/lib/utils/permissions";
import CategoryForm from "@/app/components/categories/CategoryForm";
import { Plus, Edit, Trash2, FolderOpen } from "lucide-react";

export default function CategoriesPage() {
  const { userData } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  useEffect(() => {
    if (userData && !canManageProducts(userData.role)) {
      router.push("/dashboard");
      return;
    }
    loadCategories();
  }, [userData, router]);

  const loadCategories = async () => {
    try {
      const data = await getDocuments("categories");
      setCategories(
        data.map((c) => ({ id: c.id, name: c.name || "" })) as Category[],
      );
    } catch (error) {
      console.error("Error loading categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: { name: string }) => {
    await createDocument("categories", { name: data.name });
    setShowForm(false);
    await loadCategories();
  };

  const handleUpdate = async (data: { name: string }) => {
    if (!editingCategory) return;
    await updateDocument("categories", editingCategory.id, {
      name: data.name,
    });
    setEditingCategory(null);
    await loadCategories();
  };

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        "¿Eliminar esta categoría? Los productos que la usen seguirán mostrando el nombre guardado.",
      )
    )
      return;
    try {
      await deleteDocument("categories", id);
      await loadCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      alert("No se pudo eliminar la categoría. Intenta de nuevo.");
    }
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Categorías</h1>
        {userData && canManageProducts(userData.role) && (
          <button
            onClick={() => {
              setEditingCategory(null);
              setShowForm(true);
            }}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Nueva categoría</span>
          </button>
        )}
      </div>

      {(showForm || editingCategory) && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            {editingCategory ? "Editar categoría" : "Nueva categoría"}
          </h2>
          <CategoryForm
            category={editingCategory || undefined}
            onSubmit={editingCategory ? handleUpdate : handleCreate}
            onCancel={() => {
              setShowForm(false);
              setEditingCategory(null);
            }}
          />
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center gap-2">
          <FolderOpen className="text-purple-600" size={24} />
          <h2 className="text-lg font-semibold text-gray-700">
            Listado de categorías
          </h2>
        </div>
        {categories.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No hay categorías. Crea una para usarla en los productos.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                {userData && canManageProducts(userData.role) && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {cat.name}
                  </td>
                  {userData && canManageProducts(userData.role) && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setEditingCategory(cat)}
                          className="text-purple-600 hover:text-purple-900 inline-flex items-center gap-1"
                        >
                          <Edit size={18} />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id)}
                          className="text-red-600 hover:text-red-800 inline-flex items-center gap-1"
                        >
                          <Trash2 size={18} />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
