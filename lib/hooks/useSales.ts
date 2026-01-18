import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { getDocumentsByField } from "@/lib/firebase/firestore";
import { collection, query, where, Timestamp, getDocs, doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import {
  zGetSalesResponse,
} from "@/lib/schemas";
import {
  zCreateSalePayload,
  CreateSalePayload,
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
        const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
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
      
      const { inventoryBranchId, quantity, branchId, userId } = validated;
      // Get branch inventory item
      const branchInventory = await getDocumentsByField(
        "inventory_branch",
        "branchId",
        branchId
      );
      const branchItem = branchInventory.find((item) => item.id === inventoryBranchId);

      if (!branchItem || branchItem.quantity < quantity) {
        throw new Error("No hay suficiente inventario en la sucursal");
      }

      const purchasePrice = branchItem.purchasePrice || 0;
      const salePrice = branchItem.salePrice || 0;

      const batch = writeBatch(db);
      const branchRef = doc(db, "inventory_branch", branchItem.id);

      // Update branch inventory
      const newBranchQuantity = branchItem.quantity - quantity;
      if (newBranchQuantity === 0) {
        batch.delete(branchRef);
      } else {
        batch.update(branchRef, {
          quantity: newBranchQuantity,
          lastUpdated: Timestamp.now(),
        });
      }

      // Create sale record
      const saleRef = doc(collection(db, "sales"));
      batch.set(saleRef, {
        branchId,
        inventoryBranchId: branchItem.id,
        variationId: branchItem.variationId || null,
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
      const errorMessage = error.errors?.[0]?.message || error.message || "Error al realizar la venta";
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
