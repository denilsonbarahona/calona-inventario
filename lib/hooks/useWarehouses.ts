import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { getDocuments, getDocument, createDocument, updateDocument, deleteDocument } from "@/lib/firebase/firestore";
import {
  zWarehouse,
  zGetWarehousesResponse,
} from "@/lib/schemas";
import {
  zCreateWarehousePayload,
  zUpdateWarehousePayload,
  CreateWarehousePayload,
  UpdateWarehousePayload,
} from "@/lib/schemas/payloads";
import { queryKeys } from "@/lib/const/query-keys";
import { convertFirestoreDate } from "@/lib/utils/dateHelpers";

export const useWarehouses = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.warehouses.list(),
    queryFn: async () => {
      const items = await getDocuments("warehouses");
      // Validar respuesta con Zod
      const parsed = zGetWarehousesResponse().parse(
        items.map((item) => ({
          ...item,
          createdAt: convertFirestoreDate(item.createdAt),
        }))
      );
      return parsed;
    },
  });

  return {
    data: data || [],
    isLoading,
    error,
    refetch,
  };
};

export const useWarehouse = (id: string, enabled = true) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.warehouses.detail(id),
    queryFn: async () => {
      const item = await getDocument("warehouses", id);
      if (!item) return null;
      // Validar respuesta con Zod
      const parsed = zWarehouse().parse({
        ...item,
        createdAt: convertFirestoreDate(item.createdAt),
      });
      return parsed;
    },
    enabled: enabled && !!id,
  });

  return {
    data,
    isLoading,
    error,
    refetch,
  };
};

interface UseCreateWarehouseProps {
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export const useCreateWarehouse = (config?: UseCreateWarehouseProps) => {
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: async (payload: CreateWarehousePayload) => {
      // Validar payload con Zod
      const validated = zCreateWarehousePayload().parse(payload);
      
      const id = await createDocument("warehouses", validated);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.warehouses.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.stats(),
      });
      toast.success("Bodega creada exitosamente");
      config?.onSuccess?.();
    },
    onError: (error: any) => {
      const errorMessage = error.errors?.[0]?.message || error.message || "Error al crear bodega";
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

interface UseUpdateWarehouseProps {
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export const useUpdateWarehouse = (config?: UseUpdateWarehouseProps) => {
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateWarehousePayload }) => {
      // Validar payload con Zod
      const validated = zUpdateWarehousePayload().parse(data);
      
      await updateDocument("warehouses", id, validated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.warehouses.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.stats(),
      });
      toast.success("Bodega actualizada exitosamente");
      config?.onSuccess?.();
    },
    onError: (error: any) => {
      const errorMessage = error.errors?.[0]?.message || error.message || "Error al actualizar bodega";
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

interface UseDeleteWarehouseProps {
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export const useDeleteWarehouse = (config?: UseDeleteWarehouseProps) => {
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: async (id: string) => {
      await deleteDocument("warehouses", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.warehouses.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.stats(),
      });
      toast.success("Bodega eliminada exitosamente");
      config?.onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al eliminar bodega");
      config?.onError?.(error);
    },
  });

  return {
    mutate,
    isPending,
    error,
  };
};
