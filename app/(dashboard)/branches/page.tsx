"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { Branch } from "@/types";
import { getDocuments, createDocument, deleteDocument } from "@/lib/firebase/firestore";
import { canCreateBranch } from "@/lib/utils/permissions";
import { convertFirestoreDate } from "@/lib/utils/dateHelpers";
import BranchList from "@/app/components/branches/BranchList";
import BranchForm from "@/app/components/branches/BranchForm";
import { Plus } from "lucide-react";

export default function BranchesPage() {
  const { userData } = useAuth();
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (userData && !canCreateBranch(userData.role)) {
      router.push("/dashboard");
      return;
    }
    loadBranches();
  }, [userData, router]);

  const loadBranches = async () => {
    try {
      const data = await getDocuments("branches");
      setBranches(
        data.map((b) => ({
          ...b,
          createdAt: convertFirestoreDate(b.createdAt),
        })) as Branch[]
      );
    } catch (error) {
      console.error("Error loading branches:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: Omit<Branch, "id" | "createdAt" | "createdBy">) => {
    if (!userData) return;

    await createDocument("branches", {
      ...data,
      createdBy: userData.id,
    });
    setShowForm(false);
    loadBranches();
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDocument("branches", id);
      loadBranches();
    } catch (error) {
      console.error("Error deleting branch:", error);
      alert("Error al eliminar la sucursal");
    }
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
            Sucursales
          </h1>
          <p className="text-gray-500 text-sm sm:text-base mt-1">Gestiona tus sucursales</p>
        </div>
        {canCreateBranch(userData?.role || "cashier") && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 flex items-center space-x-2 font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-200 hover:-translate-y-0.5"
          >
            <Plus size={20} />
            <span>Nueva Sucursal</span>
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100/50 p-6 sm:p-8 animate-in">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Nueva Sucursal</h2>
          <BranchForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      )}

      <BranchList
        branches={branches}
        onDelete={handleDelete}
        canEdit={canCreateBranch(userData?.role || "cashier")}
      />
    </div>
  );
}
