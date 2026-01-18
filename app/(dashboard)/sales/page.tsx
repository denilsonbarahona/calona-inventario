"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { canSell } from "@/lib/utils/permissions";
import SalesForm from "@/app/components/sales/SalesForm";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getDocumentsByField } from "@/lib/firebase/firestore";
import { doc, collection, deleteDoc, writeBatch, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export default function SalesPage() {
  const { userData } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (userData && !canSell(userData.role)) {
      router.push("/dashboard");
      return;
    }
    if (userData && userData.role !== "admin" && !userData.branchId) {
      alert("No tienes una sucursal asignada. Contacta al administrador.");
      router.push("/dashboard");
    }
  }, [userData, router]);

  const handleSale = async (data: {
    inventoryBranchId: string;
    quantity: number;
  }) => {
    if (!userData) return;

    try {
      // Get branch inventory item
      const branchInventory = await getDocumentsByField(
        "inventory_branch",
        "branchId",
        userData.branchId!
      );
      const branchItem = branchInventory.find((item) => item.id === data.inventoryBranchId);

      if (!branchItem || branchItem.quantity < data.quantity) {
        throw new Error("No hay suficiente inventario en la sucursal");
      }

      const purchasePrice = branchItem.purchasePrice || 0;
      const salePrice = branchItem.salePrice || 0;

      const batch = writeBatch(db);

      // Update branch inventory
      const newBranchQuantity = branchItem.quantity - data.quantity;
      if (newBranchQuantity === 0) {
        const branchRef = doc(db, "inventory_branch", branchItem.id);
        await deleteDoc(branchRef);
      } else {
        const branchRef = doc(db, "inventory_branch", branchItem.id);
        batch.update(branchRef, {
          quantity: newBranchQuantity,
          lastUpdated: Timestamp.now(),
        });
      }

      // Create sale record
      const saleRef = doc(collection(db, "sales"));
      batch.set(saleRef, {
        branchId: userData.branchId,
        inventoryBranchId: branchItem.id,
        variationId: branchItem.variationId || null,
        quantity: data.quantity,
        unitPrice: salePrice,
        totalPrice: salePrice * data.quantity,
        purchasePrice,
        soldBy: userData.id,
        soldAt: Timestamp.now(),
      });

      await batch.commit();
    } catch (error: any) {
      throw new Error(error.message || "Error al realizar la venta");
    }
  };

  if (!userData || !userData.branchId) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Punto de Venta</h1>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          No tienes una sucursal asignada. Contacta al administrador.
        </div>
      </div>
    );
  }

  console.log("🔍 SalesPage - userData:", userData);
  console.log("🔍 SalesPage - userData.branchId:", userData.branchId);
  console.log("🔍 SalesPage - Tipo de branchId:", typeof userData.branchId);

  return (
    <div className="h-full">
      <div className="mb-4">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">Punto de Venta</h1>
        <p className="text-sm text-gray-500 mt-1">Selecciona un producto para realizar la venta</p>
        <p className="text-xs text-gray-400 mt-1">Branch ID: {userData.branchId}</p>
      </div>
      <SalesForm branchId={userData.branchId!} onSubmit={handleSale} />
    </div>
  );
}
