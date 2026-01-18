"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { canSell } from "@/lib/utils/permissions";
import SalesForm from "@/app/components/sales/SalesForm";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

export default function SalesPage() {
  const { userData } = useAuth();
  const router = useRouter();

  // Validar permisos con useMemo
  const canAccess = useMemo(() => {
    if (!userData) return false;
    if (!canSell(userData.role)) {
      router.push("/dashboard");
      return false;
    }
    if (userData.role !== "admin" && !userData.branchId) {
      return false;
    }
    return true;
  }, [userData, router]);

  if (!userData || !canAccess) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Punto de Venta</h1>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          No tienes una sucursal asignada. Contacta al administrador.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="mb-4">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">Punto de Venta</h1>
        <p className="text-sm text-gray-500 mt-1">Selecciona un producto para realizar la venta</p>
      </div>
      <SalesForm branchId={userData.branchId!} userId={userData.id} />
    </div>
  );
}
