"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { canTransferInventory } from "@/lib/utils/permissions";
import ReturnForm from "@/app/components/inventory/ReturnForm";
import { getDocumentsByField } from "@/lib/firebase/firestore";
import { useEffect } from "react";
import {
  doc,
  collection,
  deleteDoc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export default function ReturnTransferPage() {
  const router = useRouter();
  const { userData } = useAuth();

  useEffect(() => {
    if (userData && !canTransferInventory(userData.role)) {
      router.push("/dashboard");
    }
  }, [userData, router]);

  const handleSubmit = async (data: {
    branchId: string;
    warehouseId: string;
    inventoryBranchId: string;
    quantity: number;
  }) => {
    if (!userData) return;

    try {
      // Get branch inventory item
      const branchItem = await getDocumentsByField(
        "inventory_branch",
        "branchId",
        data.branchId
      ).then((items) => items.find((item) => item.id === data.inventoryBranchId));

      if (!branchItem || branchItem.quantity < data.quantity) {
        throw new Error("No hay suficiente inventario en la sucursal");
      }

      // Get warehouse inventory to check if item already exists
      const warehouseInventory = await getDocumentsByField(
        "inventory_warehouse",
        "warehouseId",
        data.warehouseId
      );
      const warehouseItem = warehouseInventory.find(
        (item) =>
          item.name === branchItem.name &&
          true // variationId eliminado, siempre coincidir por nombre
      );

      const batch = writeBatch(db);

      // Update branch inventory (reduce)
      const newBranchQuantity = branchItem.quantity - data.quantity;
      if (newBranchQuantity === 0) {
        // Delete if quantity is 0
        const branchRef = doc(db, "inventory_branch", branchItem.id);
        await deleteDoc(branchRef);
      } else {
        const branchRef = doc(db, "inventory_branch", branchItem.id);
        batch.update(branchRef, {
          quantity: newBranchQuantity,
          lastUpdated: Timestamp.now(),
        });
      }

      // Update or create warehouse inventory (increase) - copy all product information
      if (warehouseItem) {
        const warehouseRef = doc(db, "inventory_warehouse", warehouseItem.id);
        batch.update(warehouseRef, {
          quantity: warehouseItem.quantity + data.quantity,
          lastUpdated: Timestamp.now(),
        });
      } else {
        // Create new item in warehouse with all product information from branch
        const warehouseRef = doc(collection(db, "inventory_warehouse"));
        batch.set(warehouseRef, {
          warehouseId: data.warehouseId,
          // Copy all product information from branch
          name: branchItem.name,
          type: "Producto", // Default type
          taxStatus: "Exento", // Default tax status
          priceIncludesTax: true, // Default
          barcode: branchItem.barcode || null,
          condition: null,
          images: [], // Images not copied from branch
          variations: branchItem.variations || [],
          quantity: data.quantity,
          purchasePrice: branchItem.purchasePrice,
          salePrice: branchItem.salePrice,
          lastUpdated: Timestamp.now(),
        });
      }

      // Create transfer record (inverse direction)
      const transferRef = doc(collection(db, "transfers"));
      batch.set(transferRef, {
        warehouseId: data.warehouseId,
        branchId: data.branchId,
        inventoryWarehouseId: warehouseItem?.id || null, // May be null if new item
        inventoryBranchId: branchItem.id, // Reference to branch item
        quantity: data.quantity,
        direction: "branch_to_warehouse", // Indicate inverse direction
        transferredBy: userData.id,
        transferredAt: Timestamp.now(),
      });

      await batch.commit();
      router.push("/inventory/branch");
    } catch (error: any) {
      throw new Error(error.message || "Error al retornar inventario");
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Retornar Inventario a Bodega</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <ReturnForm onSubmit={handleSubmit} onCancel={() => router.back()} />
      </div>
    </div>
  );
}
