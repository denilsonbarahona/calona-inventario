"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { createDocument } from "@/lib/firebase/firestore";
import { canCreateWarehouse } from "@/lib/utils/permissions";
import WarehouseForm from "@/app/components/warehouses/WarehouseForm";
import { useEffect } from "react";

export default function NewWarehousePage() {
  const router = useRouter();
  const { userData } = useAuth();

  useEffect(() => {
    if (userData && !canCreateWarehouse(userData.role)) {
      router.push("/warehouses");
    }
  }, [userData, router]);

  const handleSubmit = async (data: any) => {
    if (!userData) return;

    await createDocument("warehouses", {
      ...data,
      createdBy: userData.id,
    });
    router.push("/warehouses");
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Nueva Bodega</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <WarehouseForm onSubmit={handleSubmit} onCancel={() => router.back()} />
      </div>
    </div>
  );
}
