"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { Branch } from "@/types";
import { getDocument, updateDocument } from "@/lib/firebase/firestore";
import { canCreateBranch } from "@/lib/utils/permissions";
import { convertFirestoreDate } from "@/lib/utils/dateHelpers";
import BranchForm from "@/app/components/branches/BranchForm";

export default function BranchDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { userData } = useAuth();
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userData && !canCreateBranch(userData.role)) {
      router.push("/branches");
      return;
    }
    loadBranch();
  }, [params.id, userData, router]);

  const loadBranch = async () => {
    try {
      const data = await getDocument("branches", params.id as string);
      if (data) {
        setBranch({
          ...data,
          createdAt: convertFirestoreDate(data.createdAt),
        } as Branch);
      }
    } catch (error) {
      console.error("Error loading branch:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (data: any) => {
    if (!branch) return;

    await updateDocument("branches", branch.id, data);
    router.push("/branches");
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!branch) {
    return <div>Sucursal no encontrada</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Editar Sucursal</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <BranchForm branch={branch} onSubmit={handleUpdate} onCancel={() => router.back()} />
      </div>
    </div>
  );
}
