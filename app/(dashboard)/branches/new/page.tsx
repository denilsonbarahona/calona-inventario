"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { createDocument } from "@/lib/firebase/firestore";
import { canCreateBranch } from "@/lib/utils/permissions";
import BranchForm from "@/app/components/branches/BranchForm";
import { useEffect } from "react";

export default function NewBranchPage() {
  const router = useRouter();
  const { userData } = useAuth();

  useEffect(() => {
    if (userData && !canCreateBranch(userData.role)) {
      router.push("/branches");
    }
  }, [userData, router]);

  const handleSubmit = async (data: any) => {
    if (!userData) return;

    await createDocument("branches", {
      ...data,
      createdBy: userData.id,
    });
    router.push("/branches");
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Nueva Sucursal</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <BranchForm onSubmit={handleSubmit} onCancel={() => router.back()} />
      </div>
    </div>
  );
}
