import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { getDocuments, getDocument, createDocument, updateDocument, deleteDocument } from "@/lib/firebase/firestore";
import {
  zBranch,
  zGetBranchesResponse,
} from "@/lib/schemas";
import {
  zCreateBranchPayload,
  zUpdateBranchPayload,
  CreateBranchPayload,
  UpdateBranchPayload,
} from "@/lib/schemas/payloads";
import { queryKeys } from "@/lib/const/query-keys";
import { convertFirestoreDate } from "@/lib/utils/dateHelpers";

export const useBranches = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.branches.list(),
    queryFn: async () => {
      const items = await getDocuments("branches");
      // Validar respuesta con Zod
      const parsed = zGetBranchesResponse().parse(
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

export const useBranch = (id: string, enabled = true) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.branches.detail(id),
    queryFn: async () => {
      const item = await getDocument("branches", id);
      if (!item) return null;
      // Validar respuesta con Zod
      const parsed = zBranch().parse({
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

interface UseCreateBranchProps {
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export const useCreateBranch = (config?: UseCreateBranchProps) => {
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: async (payload: CreateBranchPayload) => {
      // Validar payload con Zod
      const validated = zCreateBranchPayload().parse(payload);
      
      const id = await createDocument("branches", validated);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.branches.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.stats(),
      });
      toast.success("Sucursal creada exitosamente");
      config?.onSuccess?.();
    },
    onError: (error: any) => {
      const errorMessage = error.errors?.[0]?.message || error.message || "Error al crear sucursal";
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

interface UseUpdateBranchProps {
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export const useUpdateBranch = (config?: UseUpdateBranchProps) => {
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateBranchPayload }) => {
      // Validar payload con Zod
      const validated = zUpdateBranchPayload().parse(data);
      
      await updateDocument("branches", id, validated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.branches.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.stats(),
      });
      toast.success("Sucursal actualizada exitosamente");
      config?.onSuccess?.();
    },
    onError: (error: any) => {
      const errorMessage = error.errors?.[0]?.message || error.message || "Error al actualizar sucursal";
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

interface UseDeleteBranchProps {
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export const useDeleteBranch = (config?: UseDeleteBranchProps) => {
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: async (id: string) => {
      await deleteDocument("branches", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.branches.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.stats(),
      });
      toast.success("Sucursal eliminada exitosamente");
      config?.onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al eliminar sucursal");
      config?.onError?.(error);
    },
  });

  return {
    mutate,
    isPending,
    error,
  };
};
