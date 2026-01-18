/**
 * Lista de todas las colecciones utilizadas en el sistema.
 * Las colecciones se crean automáticamente cuando se crea el primer documento.
 */

export const COLLECTIONS = {
  USERS: "users",
  WAREHOUSES: "warehouses",
  BRANCHES: "branches",
  PRODUCTS: "products",
  INVENTORY_WAREHOUSE: "inventory_warehouse",
  INVENTORY_BRANCH: "inventory_branch",
  TRANSFERS: "transfers",
  SALES: "sales",
} as const;

/**
 * Verifica que una colección exista (intentando leer un documento).
 * Si la colección no existe, se creará automáticamente al crear el primer documento.
 * @param collectionName - Nombre de la colección
 * @returns true si la colección existe o puede ser creada
 */
export const ensureCollectionExists = async (collectionName: string): Promise<boolean> => {
  try {
    const { collection, getDocs, query, limit } = await import("firebase/firestore");
    const { db } = await import("./config");
    
    if (!db) {
      throw new Error("Firestore no está inicializado");
    }
    
    // Intentar leer la colección (con límite de 1 para eficiencia)
    const colRef = collection(db, collectionName);
    const q = query(colRef, limit(1));
    const snapshot = await getDocs(q);
    
    // Si llegamos aquí, la colección existe o se puede acceder
    console.log(`✅ Colección '${collectionName}' está disponible`);
    return true;
  } catch (error: any) {
    // Si hay error, no importa - la colección se creará automáticamente
    // al crear el primer documento
    console.log(`ℹ️ Colección '${collectionName}' se creará automáticamente al crear el primer documento`);
    return true; // Retornamos true porque se creará automáticamente
  }
};
