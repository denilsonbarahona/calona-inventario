import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
  getDocumentsByField,
  getDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
} from "@/lib/firebase/firestore";
import {
  zInventoryWarehouse,
  zInventoryBranch,
  zGetInventoryWarehouseResponse,
  zGetInventoryBranchResponse,
  InventoryWarehouse,
  InventoryBranch,
} from "@/lib/schemas";
import {
  zCreateInventoryWarehousePayload,
  zUpdateInventoryWarehousePayload,
  CreateInventoryWarehousePayload,
  UpdateInventoryWarehousePayload,
} from "@/lib/schemas/payloads";
import { queryKeys } from "@/lib/const/query-keys";
import { convertFirestoreDate } from "@/lib/utils/dateHelpers";

interface UseInventoryWarehouseProps {
  warehouseId?: string;
  enabled?: boolean;
}

export const useInventoryWarehouse = ({
  warehouseId,
  enabled = true,
}: UseInventoryWarehouseProps = {}) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.inventoryWarehouse.list(warehouseId),
    queryFn: async () => {
      let items;
      if (warehouseId) {
        items = await getDocumentsByField(
          "inventory_warehouse",
          "warehouseId",
          warehouseId
        );
      } else {
        items = await getDocuments("inventory_warehouse");
      }

      // Validar respuesta con Zod
      const parsed = zGetInventoryWarehouseResponse().parse(
        items.map((item) => ({
          ...item,
          lastUpdated: convertFirestoreDate(item.lastUpdated),
        }))
      );

      return parsed;
    },
    enabled: enabled && (warehouseId ? true : true),
  });

  return {
    data: data || [],
    isLoading,
    error,
    refetch,
  };
};

interface UseInventoryBranchProps {
  branchId?: string;
  enabled?: boolean;
}

export const useInventoryBranch = ({
  branchId,
  enabled = true,
}: UseInventoryBranchProps = {}) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.inventoryBranch.list(branchId),
    queryFn: async () => {
      if (!branchId) {
        console.warn("⚠️ useInventoryBranch: branchId no está definido");
        return [];
      }

      console.log("🔍 useInventoryBranch: Buscando inventario para branchId:", branchId);

      let items = await getDocumentsByField(
        "inventory_branch",
        "branchId",
        branchId
      );

      console.log("📦 useInventoryBranch: Items encontrados con branchId:", items.length);

      // Si no encuentra nada, intentar obtener todos y usar transferencias
      if (items.length === 0) {
        console.log("⚠️ useInventoryBranch: No se encontraron items con branchId, buscando por transferencias...");
        const allItems = await getDocuments("inventory_branch");
        console.log("📋 useInventoryBranch: Total de items en inventory_branch:", allItems.length);

        const transfers = await getDocumentsByField("transfers", "branchId", branchId);
        console.log("🔄 useInventoryBranch: Transferencias encontradas:", transfers.length);

        const inventoryBranchIdsFromTransfers = new Set(
          transfers.map((t: any) => t.inventoryBranchId).filter(Boolean)
        );
        console.log("🔄 useInventoryBranch: IDs de inventory_branch desde transferencias:", Array.from(inventoryBranchIdsFromTransfers));

        items = allItems.filter((item: any) =>
          inventoryBranchIdsFromTransfers.has(item.id)
        );
        console.log("📦 useInventoryBranch: Items filtrados por transferencias:", items.length);

        // Actualizar items sin branchId
        if (items.length > 0) {
          try {
            const { doc, writeBatch, Timestamp } = await import("firebase/firestore");
            const { db } = await import("@/lib/firebase/config");
            const batch = writeBatch(db);

            let updateCount = 0;
            for (const item of items) {
              if (!item.branchId) {
                const itemRef = doc(db, "inventory_branch", item.id);
                batch.update(itemRef, {
                  branchId: branchId,
                  lastUpdated: Timestamp.now(),
                });
                updateCount++;
              }
            }

            if (updateCount > 0) {
              await batch.commit();
              console.log("✅ useInventoryBranch: Items actualizados con branchId:", updateCount);
            }
          } catch (updateError) {
            console.error("❌ useInventoryBranch: Error al actualizar items:", updateError);
          }
        }
      }

      // Preparar items para validación
      const itemsToValidate = items.map((item) => ({
        ...item,
        branchId: item.branchId || branchId,
        lastUpdated: convertFirestoreDate(item.lastUpdated),
      }));

      // Validar respuesta con Zod
      try {
        const parsed = zGetInventoryBranchResponse().parse(itemsToValidate);
        console.log("✅ useInventoryBranch: Items parseados y validados:", parsed.length);
        return parsed;
      } catch (validationError) {
        console.error("❌ useInventoryBranch: Error de validación Zod:", validationError);
        // Retornar items sin validar en caso de error (para debugging)
        return itemsToValidate as InventoryBranch[];
      }
    },
    enabled: enabled && !!branchId,
  });

  return {
    data: data || [],
    isLoading,
    error,
    refetch,
  };
};

interface UseCreateInventoryWarehouseProps {
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export const useCreateInventoryWarehouse = (
  config?: UseCreateInventoryWarehouseProps
) => {
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: async (payload: CreateInventoryWarehousePayload) => {
      // Validar payload con Zod
      const validated = zCreateInventoryWarehousePayload().parse(payload);
      
      const id = await createDocument("inventory_warehouse", validated);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventoryWarehouse.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.stats(),
      });
      toast.success("Producto creado exitosamente");
      config?.onSuccess?.();
    },
    onError: (error: any) => {
      const errorMessage = error.errors?.[0]?.message || error.message || "Error al crear producto";
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

interface UseUpdateInventoryWarehouseProps {
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export const useUpdateInventoryWarehouse = (
  config?: UseUpdateInventoryWarehouseProps
) => {
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateInventoryWarehousePayload;
    }) => {
      // Validar payload con Zod
      const validated = zUpdateInventoryWarehousePayload().parse(data);
      
      await updateDocument("inventory_warehouse", id, validated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventoryWarehouse.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.stats(),
      });
      toast.success("Producto actualizado exitosamente");
      config?.onSuccess?.();
    },
    onError: (error: any) => {
      const errorMessage = error.errors?.[0]?.message || error.message || "Error al actualizar producto";
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

interface UseDeleteInventoryWarehouseProps {
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export const useDeleteInventoryWarehouse = (
  config?: UseDeleteInventoryWarehouseProps
) => {
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: async (id: string) => {
      await deleteDocument("inventory_warehouse", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventoryWarehouse.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.stats(),
      });
      toast.success("Producto eliminado exitosamente");
      config?.onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al eliminar producto");
      config?.onError?.(error);
    },
  });

  return {
    mutate,
    isPending,
    error,
  };
};
