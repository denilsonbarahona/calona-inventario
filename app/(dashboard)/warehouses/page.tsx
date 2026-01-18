"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { Warehouse } from "@/types";
import { getDocuments, createDocument, deleteDocument } from "@/lib/firebase/firestore";
import { canCreateWarehouse } from "@/lib/utils/permissions";
import { convertFirestoreDate } from "@/lib/utils/dateHelpers";
import WarehouseList from "@/app/components/warehouses/WarehouseList";
import WarehouseForm from "@/app/components/warehouses/WarehouseForm";
import { Plus } from "lucide-react";

export default function WarehousesPage() {
  const { userData } = useAuth();
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (userData && !canCreateWarehouse(userData.role)) {
      router.push("/dashboard");
      return;
    }
    loadWarehouses();
  }, [userData, router]);

  const loadWarehouses = async () => {
    try {
      const data = await getDocuments("warehouses");
      setWarehouses(
        data.map((w) => ({
          ...w,
          createdAt: convertFirestoreDate(w.createdAt),
        })) as Warehouse[]
      );
    } catch (error) {
      console.error("Error loading warehouses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: Omit<Warehouse, "id" | "createdAt" | "createdBy">) => {
    if (!userData) return;

    await createDocument("warehouses", {
      ...data,
      createdBy: userData.id,
    });
    setShowForm(false);
    loadWarehouses();
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDocument("warehouses", id);
      loadWarehouses();
    } catch (error) {
      console.error("Error deleting warehouse:", error);
      alert("Error al eliminar la bodega");
    }
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Bodegas</h1>
        {canCreateWarehouse(userData?.role || "cashier") && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Nueva Bodega</span>
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Nueva Bodega</h2>
          <WarehouseForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      )}

      <WarehouseList
        warehouses={warehouses}
        onDelete={handleDelete}
        canEdit={canCreateWarehouse(userData?.role || "cashier")}
      />
    </div>
  );
}
