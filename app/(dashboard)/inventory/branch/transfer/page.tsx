"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { canTransferInventory } from "@/lib/utils/permissions";
import ReturnForm from "@/app/components/inventory/ReturnForm";
import { getDocumentsByField, getDocument } from "@/lib/firebase/firestore";
import { useEffect } from "react";
import {
  doc,
  collection,
  deleteDoc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import {
  getDisplayVariation,
  getQuantityByVariation,
  normalizeWarehouseDoc,
} from "@/lib/utils/inventoryHelpers";

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
      const branchItems = await getDocumentsByField(
        "inventory_branch",
        "branchId",
        data.branchId,
      );
      const branchItem = branchItems.find(
        (item) => item.id === data.inventoryBranchId,
      );

      if (!branchItem || branchItem.quantity < data.quantity) {
        throw new Error("No hay suficiente inventario en la sucursal");
      }

      const variation = getDisplayVariation(branchItem);
      const variationId = variation?.id ?? "default";

      const batch = writeBatch(db);

      const newBranchQuantity = branchItem.quantity - data.quantity;
      if (newBranchQuantity === 0) {
        const branchRef = doc(db, "inventory_branch", branchItem.id);
        batch.delete(branchRef);
      } else {
        const branchRef = doc(db, "inventory_branch", branchItem.id);
        batch.update(branchRef, {
          quantity: newBranchQuantity,
          lastUpdated: Timestamp.now(),
        });
      }

      const productId = branchItem.productId ?? null;
      let warehouseDocId: string | null = null;

      if (productId) {
        const rawWarehouse = await getDocument(
          "inventory_warehouse",
          productId,
        );
        if (rawWarehouse) {
          const warehouseDoc = normalizeWarehouseDoc({
            ...rawWarehouse,
            id: rawWarehouse.id,
          });
          const currentQty = getQuantityByVariation(warehouseDoc, variationId);
          const newQty = currentQty + data.quantity;
          const existingIdx = warehouseDoc.variations?.findIndex(
            (v) => v.id === variationId,
          );
          const newVariations =
            existingIdx !== undefined && existingIdx >= 0
              ? (warehouseDoc.variations ?? []).map((v, i) =>
                  i === existingIdx
                    ? { ...v, quantity: newQty }
                    : { ...v, quantity: v.quantity ?? 0 },
                )
              : [
                  ...(warehouseDoc.variations ?? []).map((v) => ({
                    ...v,
                    quantity: v.quantity ?? 0,
                  })),
                  {
                    ...(variation ?? {
                      id: variationId,
                      type: "default",
                      value: "Único",
                    }),
                    quantity: newQty,
                  },
                ];
          const warehouseRef = doc(db, "inventory_warehouse", warehouseDoc.id);
          batch.update(warehouseRef, {
            variations: newVariations,
            lastUpdated: Timestamp.now(),
          });
          warehouseDocId = warehouseDoc.id;
        }
      }

      if (!warehouseDocId) {
        const warehouseRef = doc(collection(db, "inventory_warehouse"));
        const variationDef = variation ?? {
          id: "default",
          type: "default",
          value: "Único",
        };
        const variationsWithQty = [
          { ...variationDef, quantity: data.quantity },
        ];
        warehouseDocId = warehouseRef.id;
        batch.set(warehouseRef, {
          warehouseId: data.warehouseId,
          name: branchItem.name,
          type: "Producto",
          taxStatus: "Exento",
          priceIncludesTax: true,
          barcode: branchItem.barcode || null,
          condition: null,
          images: [],
          hasVariations: (branchItem.variations?.length ?? 0) > 1,
          variations: variationsWithQty,
          purchasePrice: branchItem.purchasePrice,
          salePrice: branchItem.salePrice,
          lastUpdated: Timestamp.now(),
        });
      }

      const transferRef = doc(collection(db, "transfers"));
      batch.set(transferRef, {
        warehouseId: data.warehouseId,
        branchId: data.branchId,
        inventoryWarehouseId: warehouseDocId,
        inventoryBranchId: branchItem.id,
        variationId,
        quantity: data.quantity,
        direction: "branch_to_warehouse",
        transferredBy: userData.id,
        transferredAt: Timestamp.now(),
      });

      await batch.commit();
      router.push("/inventory/branch");
    } catch (error: unknown) {
      throw new Error(
        error instanceof Error ? error.message : "Error al retornar inventario",
      );
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Retornar Inventario a Bodega
      </h1>
      <div className="bg-white rounded-lg shadow p-6">
        <ReturnForm onSubmit={handleSubmit} onCancel={() => router.back()} />
      </div>
    </div>
  );
}
