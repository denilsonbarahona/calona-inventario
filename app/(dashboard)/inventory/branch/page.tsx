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
        <select
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
        >
          <option value="">Seleccione una sucursal</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>

      {selectedBranch && <InventoryTable inventory={inventory} type="branch" />}
    </div>
  );
}
