"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { InventoryBranch, Branch } from "@/types";
import { getDocuments, getDocumentsByField } from "@/lib/firebase/firestore";
import { convertFirestoreDate } from "@/lib/utils/dateHelpers";
import InventoryTable from "@/app/components/inventory/InventoryTable";
import { canTransferInventory } from "@/lib/utils/permissions";
import { ArrowLeft } from "lucide-react";

export default function BranchInventoryPage() {
  const router = useRouter();
  const { userData } = useAuth();
  const [inventory, setInventory] = useState<InventoryBranch[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      loadInventory();
    } else {
      setInventory([]);
    }
  }, [selectedBranch]);

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

  const loadInventory = async () => {
    if (!selectedBranch) return;

    try {
      const data = await getDocumentsByField("inventory_branch", "branchId", selectedBranch);
      setInventory(
        data.map((item) => ({
          ...item,
          lastUpdated: convertFirestoreDate(item.lastUpdated),
        })) as InventoryBranch[]
      );
    } catch (error) {
      console.error("Error loading inventory:", error);
    }
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Inventario de Sucursales</h1>
        {userData && canTransferInventory(userData.role) && (
          <button
            onClick={() => router.push("/inventory/branch/transfer")}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
          >
            <ArrowLeft size={20} />
            <span>Retornar a Bodega</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Sucursal</label>
        <div className="relative w-full md:w-64">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 appearance-none cursor-pointer hover:border-gray-400"
          >
            <option value="">Seleccione una sucursal</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {selectedBranch && <InventoryTable inventory={inventory} type="branch" />}
    </div>
  );
}
