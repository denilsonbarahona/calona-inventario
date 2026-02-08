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
  getQuantityByVariation,
  normalizeWarehouseDoc,
} from "@/lib/utils/inventoryHelpers";
import type { ProductVariation, ProductVariationWithQuantity } from "@/types";

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
    variationId: string;
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

      if (!branchItem) {
        throw new Error("Producto no encontrado en la sucursal");
      }

      const variationId = data.variationId || "default";
      const branchVariations: ProductVariationWithQuantity[] =
        (branchItem.variations?.length ?? 0) > 0
          ? (branchItem.variations ?? []).map(
              (v: ProductVariation & { quantity?: number }) => ({
                ...v,
                quantity: v.quantity ?? 0,
              }),
            )
          : [
              {
                id: "default",
                type: "Único",
                value: "Único",
                quantity: branchItem.quantity ?? 0,
              },
            ];
      const varIdx = branchVariations.findIndex((v) => v.id === variationId);
      if (varIdx < 0) {
        throw new Error("Variación no encontrada en la sucursal");
      }
      const variationQty = branchVariations[varIdx].quantity ?? 0;
      if (variationQty < data.quantity) {
        throw new Error("No hay suficiente inventario para esta variación");
      }

      const batch = writeBatch(db);

      const newVarQty = variationQty - data.quantity;
      branchVariations[varIdx] = {
        ...branchVariations[varIdx],
        quantity: newVarQty,
      };
      const newBranchVariations = branchVariations.filter(
        (v) => v.quantity > 0,
      );
      const newBranchTotal = newBranchVariations.reduce(
        (sum: number, v: ProductVariationWithQuantity) => sum + v.quantity,
        0,
      );

      if (newBranchTotal === 0) {
        const branchRef = doc(db, "inventory_branch", branchItem.id);
        batch.delete(branchRef);
      } else {
        const branchRef = doc(db, "inventory_branch", branchItem.id);
        const variationsPayload = newBranchVariations.map((v) => ({
          id: v.id,
          type: v.type,
          value: v.value,
          quantity: v.quantity,
          ...(v.sku != null && v.sku !== "" ? { sku: v.sku } : {}),
        }));
        batch.update(branchRef, {
          variations: variationsPayload,
          quantity: newBranchTotal,
          lastUpdated: Timestamp.now(),
        });
      }

      const productId = branchItem.productId ?? null;
      const variationDef = branchVariations[varIdx];
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
                    id: variationDef.id,
                    type: variationDef.type,
                    value: variationDef.value,
                    sku: variationDef.sku,
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
        const variationsWithQty = [
          {
            id: variationDef.id,
            type: variationDef.type,
            value: variationDef.value,
            sku: variationDef.sku,
            quantity: data.quantity,
          },
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
          hasVariations: false,
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
