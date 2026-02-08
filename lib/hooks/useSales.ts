import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { getDocumentsByField } from "@/lib/firebase/firestore";
import {
  collection,
  query,
  where,
  Timestamp,
  getDocs,
  doc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { zGetSalesResponse } from "@/lib/schemas";
import {
  zCreateSalePayload,
  zCreateSalesPayload,
  CreateSalePayload,
  CreateSalesPayload,
} from "@/lib/schemas/payloads";
import { queryKeys } from "@/lib/const/query-keys";
import { convertFirestoreDate } from "@/lib/utils/dateHelpers";

interface UseSalesProps {
  startDate?: string;
  endDate?: string;
  branchId?: string;
  enabled?: boolean;
}

export const useSales = ({
  startDate,
  endDate,
  branchId,
  enabled = true,
}: UseSalesProps = {}) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.sales.list({ startDate, endDate, branchId }),
    queryFn: async () => {
      const salesRef = collection(db, "sales");
      const constraints: any[] = [];

      if (startDate && endDate) {
        const [startYear, startMonth, startDay] = startDate
          .split("-")
          .map(Number);
        const start = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);

        const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
        const end = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

        constraints.push(where("soldAt", ">=", Timestamp.fromDate(start)));
        constraints.push(where("soldAt", "<=", Timestamp.fromDate(end)));
      }

      if (branchId) {
        constraints.push(where("branchId", "==", branchId));
      }

      const q = query(salesRef, ...constraints);
      const querySnapshot = await getDocs(q);
      const salesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        soldAt: convertFirestoreDate(doc.data().soldAt),
      }));

      // Validar respuesta con Zod
      const parsed = zGetSalesResponse().parse(salesData);
      return parsed;
    },
    enabled,
  });

  return {
    data: data || [],
    isLoading,
    error,
    refetch,
  };
};

interface UseTodaySalesProps {
  branchId?: string;
  enabled?: boolean;
}

export const useTodaySales = ({
  branchId,
  enabled = true,
}: UseTodaySalesProps = {}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const startDate = today.toISOString().split("T")[0];
  const endDate = endOfDay.toISOString().split("T")[0];

  return useSales({
    startDate,
    endDate,
    branchId,
    enabled,
  });
};

interface VariationWithQty {
  id: string;
  type: string;
  value: string;
  quantity: number;
  sku?: string;
}

interface UseCreateSaleProps {
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export const useCreateSale = (config?: UseCreateSaleProps) => {
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: async (payload: CreateSalePayload) => {
      // Validar payload con Zod
      const validated = zCreateSalePayload().parse(payload);

      const {
        inventoryBranchId,
        variationId: payloadVariationId,
        quantity,
        branchId,
        userId,
      } = validated;
      const variationId = payloadVariationId ?? "default";

      const branchInventory = await getDocumentsByField(
        "inventory_branch",
        "branchId",
        branchId,
      );
      const branchItem = branchInventory.find(
        (item: { id: string }) => item.id === inventoryBranchId,
      );

      if (!branchItem) {
        throw new Error("Producto no encontrado en la sucursal");
      }

      const branchVariations: VariationWithQty[] = (
        branchItem.variations ?? []
      ).map(
        (v: {
          id: string;
          type: string;
          value: string;
          quantity?: number;
          sku?: string;
        }) => ({
          ...v,
          quantity: v.quantity ?? 0,
        }),
      );
      const varIdx = branchVariations.findIndex(
        (v: VariationWithQty) => v.id === variationId,
      );
      if (varIdx < 0) {
        throw new Error("Variación no encontrada");
      }
      const variationQty = branchVariations[varIdx].quantity ?? 0;
      if (variationQty < quantity) {
        throw new Error(
          `No hay suficiente stock para esta variación. Disponible: ${variationQty}`,
        );
      }

      const purchasePrice = branchItem.purchasePrice || 0;
      const salePrice = branchItem.salePrice || 0;

      const batch = writeBatch(db);
      const branchRef = doc(db, "inventory_branch", branchItem.id);

      const newVarQty = variationQty - quantity;
      branchVariations[varIdx] = {
        ...branchVariations[varIdx],
        quantity: newVarQty,
      };
      const newBranchVariations = branchVariations.filter(
        (v: VariationWithQty) => v.quantity > 0,
      );
      const newBranchTotal = newBranchVariations.reduce(
        (sum: number, v: VariationWithQty) => sum + v.quantity,
        0,
      );

      if (newBranchTotal === 0) {
        batch.delete(branchRef);
      } else {
        const variationsPayload = newBranchVariations.map(
          (v: VariationWithQty) => ({
            id: v.id,
            type: v.type,
            value: v.value,
            quantity: v.quantity,
            ...(v.sku != null && v.sku !== "" ? { sku: v.sku } : {}),
          }),
        );
        batch.update(branchRef, {
          variations: variationsPayload,
          quantity: newBranchTotal,
          lastUpdated: Timestamp.now(),
        });
      }

      const saleRef = doc(collection(db, "sales"));
      batch.set(saleRef, {
        branchId,
        inventoryBranchId: branchItem.id,
        variationId,
        quantity,
        unitPrice: salePrice,
        totalPrice: salePrice * quantity,
        purchasePrice,
        soldBy: userId,
        soldAt: Timestamp.now(),
      });

      await batch.commit();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sales.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventoryBranch.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.stats(),
      });
      config?.onSuccess?.();
    },
    onError: (error: any) => {
      const errorMessage =
        error.errors?.[0]?.message ||
        error.message ||
        "Error al realizar la venta";
      toast.error(errorMessage);
      config?.onError?.(error);
    },
  });

  return {
    mutate,
    isPending,
    error,
  };
};

interface UseCreateSalesProps {
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export const useCreateSales = (config?: UseCreateSalesProps) => {
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: async (payload: CreateSalesPayload) => {
      const validated = zCreateSalesPayload().parse(payload);
      const { branchId, userId, items } = validated;

      if (items.length === 0) {
        throw new Error("El carrito está vacío");
      }

      const uniqueBranchIds = [
        ...new Set(items.map((i) => i.inventoryBranchId)),
      ];
      const branchInventory = await getDocumentsByField(
        "inventory_branch",
        "branchId",
        branchId,
      );
      const branchDocsById = new Map(
        branchInventory
          .filter((item) => uniqueBranchIds.includes(item.id))
          .map((item) => [item.id, item]),
      );

      for (const invId of uniqueBranchIds) {
        if (!branchDocsById.has(invId)) {
          throw new Error(`Producto no encontrado en la sucursal: ${invId}`);
        }
      }

      const batch = writeBatch(db);

      for (const inventoryBranchId of uniqueBranchIds) {
        const branchItem = branchDocsById.get(inventoryBranchId)!;
        const branchVariations: VariationWithQty[] =
          (branchItem.variations?.length ?? 0) > 0
            ? (branchItem.variations ?? []).map(
                (v: {
                  id: string;
                  type: string;
                  value: string;
                  quantity?: number;
                  sku?: string;
                }) => ({
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

        const toSubtractByVarId: Record<string, number> = {};
        for (const it of items) {
          if (it.inventoryBranchId !== inventoryBranchId) continue;
          const vid = it.variationId ?? "default";
          toSubtractByVarId[vid] = (toSubtractByVarId[vid] ?? 0) + it.quantity;
        }

        for (const vid of Object.keys(toSubtractByVarId)) {
          const current = branchVariations.find(
            (v: VariationWithQty) => v.id === vid,
          );
          const currentQty = current?.quantity ?? 0;
          const subtract = toSubtractByVarId[vid];
          if (currentQty < subtract) {
            throw new Error(
              `No hay suficiente stock para la variación. Disponible: ${currentQty}, solicitado: ${subtract}`,
            );
          }
        }

        const newBranchVariations = branchVariations.map(
          (v: VariationWithQty) => {
            const subtract = toSubtractByVarId[v.id] ?? 0;
            return { ...v, quantity: v.quantity - subtract };
          },
        );
        const newBranchVariationsFiltered = newBranchVariations.filter(
          (v: VariationWithQty) => v.quantity > 0,
        );
        const newBranchTotal = newBranchVariationsFiltered.reduce(
          (sum: number, v: VariationWithQty) => sum + v.quantity,
          0,
        );

        const branchRef = doc(db, "inventory_branch", branchItem.id);
        if (newBranchTotal === 0) {
          batch.delete(branchRef);
        } else {
          const variationsPayload = newBranchVariationsFiltered.map(
            (v: VariationWithQty) => ({
              id: v.id,
              type: v.type,
              value: v.value,
              quantity: v.quantity,
              ...(v.sku != null && v.sku !== "" ? { sku: v.sku } : {}),
            }),
          );
          batch.update(branchRef, {
            variations: variationsPayload,
            quantity: newBranchTotal,
            lastUpdated: Timestamp.now(),
          });
        }
      }

      for (const it of items) {
        const branchItem = branchDocsById.get(it.inventoryBranchId)!;
        const salePrice = branchItem.salePrice || 0;
        const purchasePrice = branchItem.purchasePrice || 0;
        const variationId = it.variationId ?? "default";
        const saleRef = doc(collection(db, "sales"));
        batch.set(saleRef, {
          branchId,
          inventoryBranchId: it.inventoryBranchId,
          variationId,
          quantity: it.quantity,
          unitPrice: salePrice,
          totalPrice: salePrice * it.quantity,
          purchasePrice,
          soldBy: userId,
          soldAt: Timestamp.now(),
        });
      }

      await batch.commit();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sales.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventoryBranch.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.stats(),
      });
      config?.onSuccess?.();
    },
    onError: (error: any) => {
      const errorMessage =
        error.errors?.[0]?.message ||
        error.message ||
        "Error al realizar la venta";
      toast.error(errorMessage);
      config?.onError?.(error);
    },
  });

  return {
    mutate,
    isPending,
    error,
  };
};
