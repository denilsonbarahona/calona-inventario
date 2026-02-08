"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { canTransferInventory } from "@/lib/utils/permissions";
import TransferForm from "@/app/components/inventory/TransferForm";
import { getDocumentsByField, getDocument } from "@/lib/firebase/firestore";
import { useEffect } from "react";
import { doc, collection, writeBatch, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import {
  isSameVariation,
  getDisplayVariation,
  getQuantityByVariation,
  normalizeWarehouseDoc,
} from "@/lib/utils/inventoryHelpers";

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
    variationId: string;
    quantity: number;
  }) => {
    if (!userData) return;

    try {
      const rawDoc = await getDocument(
        "inventory_warehouse",
        data.inventoryWarehouseId,
      );
      if (!rawDoc) {
        throw new Error("Producto no encontrado en bodega");
      }
      const warehouseDoc = normalizeWarehouseDoc({
        ...rawDoc,
        id: rawDoc.id,
      });
      const currentQty = getQuantityByVariation(warehouseDoc, data.variationId);
      if (currentQty < data.quantity) {
        throw new Error("No hay suficiente inventario en la bodega");
      }

      const branchInventory = await getDocumentsByField(
        "inventory_branch",
        "branchId",
        data.branchId,
      );
      const variationDef = warehouseDoc.variations?.find(
        (v) => v.id === data.variationId,
      ) ?? { id: data.variationId, type: "?", value: "?", sku: "" };
      const variation = {
        id: variationDef.id,
        type: variationDef.type,
        value: variationDef.value,
        sku: variationDef.sku,
      };
      const branchItem = branchInventory.find(
        (item) =>
          item.name === warehouseDoc.name &&
          isSameVariation(getDisplayVariation(item), variation),
      );

      const batch = writeBatch(db);

      const newQty = Math.max(0, currentQty - data.quantity);
      const newVariations = (warehouseDoc.variations ?? []).map((v) =>
        v.id === data.variationId
          ? { ...v, quantity: newQty }
          : { ...v, quantity: v.quantity ?? 0 },
      );
      const warehouseRef = doc(db, "inventory_warehouse", warehouseDoc.id);
      batch.update(warehouseRef, {
        variations: newVariations,
        lastUpdated: Timestamp.now(),
      });

      if (branchItem) {
        const branchRef = doc(db, "inventory_branch", branchItem.id);
        batch.update(branchRef, {
          branchId: data.branchId,
          quantity: branchItem.quantity + data.quantity,
          lastUpdated: Timestamp.now(),
        });
      } else {
        const branchRef = doc(collection(db, "inventory_branch"));
        batch.set(branchRef, {
          branchId: data.branchId,
          name: warehouseDoc.name,
          productId: warehouseDoc.id,
          variation,
          variations: [{ ...variation, quantity: data.quantity }],
          barcode: warehouseDoc.barcode || null,
          quantity: data.quantity,
          purchasePrice: warehouseDoc.purchasePrice,
          salePrice: warehouseDoc.salePrice,
          lastUpdated: Timestamp.now(),
        });
      }

      const transferRef = doc(collection(db, "transfers"));
      batch.set(transferRef, {
        warehouseId: data.warehouseId,
        branchId: data.branchId,
        inventoryWarehouseId: warehouseDoc.id,
        variationId: data.variationId,
        quantity: data.quantity,
        direction: "warehouse_to_branch",
        transferredBy: userData.id,
        transferredAt: Timestamp.now(),
      });

      await batch.commit();
      router.push("/inventory/warehouse");
    } catch (error: unknown) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Error al transferir inventario",
      );
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Transferir Inventario
      </h1>
      <div className="bg-white rounded-lg shadow p-6">
        <TransferForm onSubmit={handleSubmit} onCancel={() => router.back()} />
      </div>
    </div>
  );
}
