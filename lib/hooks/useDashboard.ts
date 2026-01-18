import { useQuery } from "@tanstack/react-query";
import { getDocuments } from "@/lib/firebase/firestore";
import { collection, query, where, Timestamp, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { zGetSalesResponse } from "@/lib/schemas";
import { queryKeys } from "@/lib/const/query-keys";
import { convertFirestoreDate } from "@/lib/utils/dateHelpers";
import { calculateTotalSales } from "@/lib/utils/calculations";

export const useDashboardStats = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: async () => {
      // Cargar bodegas
      const warehouses = await getDocuments("warehouses");
      const warehousesCount = warehouses.length;

      // Cargar sucursales
      const branches = await getDocuments("branches");
      const branchesCount = branches.length;

      // Cargar ventas del día actual
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const salesRef = collection(db, "sales");
      const q = query(
        salesRef,
        where("soldAt", ">=", Timestamp.fromDate(today)),
        where("soldAt", "<=", Timestamp.fromDate(endOfDay))
      );

      const querySnapshot = await getDocs(q);
      const salesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        soldAt: convertFirestoreDate(doc.data().soldAt),
      }));

      // Validar respuesta con Zod
      const parsed = zGetSalesResponse().parse(salesData);
      const todaySales = calculateTotalSales(parsed);

      return {
        warehousesCount,
        branchesCount,
        todaySales,
      };
    },
  });

  return {
    data,
    isLoading,
    error,
    refetch,
  };
};
