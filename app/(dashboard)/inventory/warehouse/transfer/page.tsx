"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { canTransferInventory } from "@/lib/utils/permissions";
import TransferForm from "@/app/components/inventory/TransferForm";
import {
  getDocumentsByField,
  createDocument,
  updateDocument,
} from "@/lib/firebase/firestore";
import { useEffect } from "react";
import {
  doc,
  collection,
  deleteDoc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export default function TransferPage() {
  const router = useRouter();
  const { userData } = useAuth();

  useEffect(() => {
    if (userData && !canTransferInventory(userData.role)) {
      router.push("/dashboard");
    }
  }, [userData, router]);

  const handleSubmit = async (data: {
    warehouseId: string;
    branchId: string;
    inventoryWarehouseId: string;
    variationId?: string;
    quantity: number;
  }) => {
    if (!userData) return;

    try {
      // Get warehouse inventory item
      const warehouseItem = await getDocumentsByField(
        "inventory_warehouse",
        "warehouseId",
        data.warehouseId
      ).then((items) => items.find((item) => item.id === data.inventoryWarehouseId));

      if (!warehouseItem || warehouseItem.quantity < data.quantity) {
        throw new Error("No hay suficiente inventario en la bodega");
      }

      // Get branch inventory to check if item already exists
      const branchInventory = await getDocumentsByField(
        "inventory_branch",
        "branchId",
        data.branchId
      );
      const branchItem = branchInventory.find(
        (item) =>
          item.name === warehouseItem.name &&
          (item.variationId === data.variationId ||
            (!item.variationId && !data.variationId && !warehouseItem.variationId))
      );

      const batch = writeBatch(db);

      // Update warehouse inventory
      const newWarehouseQuantity = warehouseItem.quantity - data.quantity;
      if (newWarehouseQuantity === 0) {
        // Delete if quantity is 0
        const warehouseRef = doc(db, "inventory_warehouse", warehouseItem.id);
        await deleteDoc(warehouseRef);
      } else {
        const warehouseRef = doc(db, "inventory_warehouse", warehouseItem.id);
        batch.update(warehouseRef, {
          quantity: newWarehouseQuantity,
          lastUpdated: Timestamp.now(),
        });
      }

      // Update or create branch inventory - copy all product information
      if (branchItem) {
        const branchRef = doc(db, "inventory_branch", branchItem.id);
        batch.update(branchRef, {
          branchId: data.branchId, // Asegurar que tenga branchId
          quantity: branchItem.quantity + data.quantity,
          lastUpdated: Timestamp.now(),
        });
      } else {
        const branchRef = doc(collection(db, "inventory_branch"));
        batch.set(branchRef, {
          branchId: data.branchId,
          // Copy all product information from warehouse
          name: warehouseItem.name,
          productId: warehouseItem.id, // Reference to warehouse item
          variationId: data.variationId || warehouseItem.variationId || null,
          variations: warehouseItem.variations || [], // Copy variations
          barcode: warehouseItem.barcode || null, // Copy barcode
          quantity: data.quantity,
          purchasePrice: warehouseItem.purchasePrice,
          salePrice: warehouseItem.salePrice,
          lastUpdated: Timestamp.now(),
        });
      }

      // Create transfer record
      const transferRef = doc(collection(db, "transfers"));
      batch.set(transferRef, {
        warehouseId: data.warehouseId,
        branchId: data.branchId,
        inventoryWarehouseId: warehouseItem.id,
        variationId: data.variationId || null,
        quantity: data.quantity,
        direction: "warehouse_to_branch", // Indicate normal direction
        transferredBy: userData.id,
        transferredAt: Timestamp.now(),
      });

      await batch.commit();
      router.push("/inventory/warehouse");
    } catch (error: any) {
      throw new Error(error.message || "Error al transferir inventario");
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Transferir Inventario</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <TransferForm onSubmit={handleSubmit} onCancel={() => router.back()} />
      </div>
    </div>
  );
}
