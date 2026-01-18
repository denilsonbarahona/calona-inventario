import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  QueryConstraint,
  writeBatch,
} from "firebase/firestore";
import { db } from "./config";

/**
 * Elimina valores undefined de un objeto (Firestore no acepta undefined)
 */
const removeUndefined = (obj: any): any => {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  }
  const cleaned: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      cleaned[key] = removeUndefined(obj[key]);
    }
  }
  return cleaned;
};

/**
 * Crea o actualiza un documento en una colección.
 * Si la colección no existe, se crea automáticamente al crear el primer documento.
 * @param collectionName - Nombre de la colección
 * @param data - Datos del documento
 * @param documentId - (Opcional) ID específico del documento. Si no se proporciona, Firestore genera uno automáticamente.
 * @returns ID del documento creado
 */
export const createDocument = async (
  collectionName: string,
  data: any,
  documentId?: string
) => {
  if (!db) {
    throw new Error("Firestore no está inicializado. Verifica la configuración de Firebase.");
  }
  
  try {
    // Limpiar datos eliminando valores undefined
    const cleanedData = removeUndefined({
      ...data,
      createdAt: data.createdAt || Timestamp.now(),
    });

    // Si se proporciona un ID, usar setDoc (crea o actualiza)
    if (documentId) {
      const docRef = doc(db, collectionName, documentId);
      await setDoc(docRef, cleanedData);
      console.log(`✅ Documento creado/actualizado en colección '${collectionName}' con ID: ${documentId}`);
      return documentId;
    } else {
      // Si no se proporciona ID, usar addDoc (Firestore genera el ID)
      const docRef = await addDoc(collection(db, collectionName), cleanedData);
      console.log(`✅ Documento creado en colección '${collectionName}' con ID generado: ${docRef.id}`);
      console.log(`💡 La colección '${collectionName}' se creó automáticamente si no existía`);
      return docRef.id;
    }
  } catch (error: any) {
    console.error(`❌ Error al crear documento en colección '${collectionName}':`, error);
    console.error(`   Código: ${error.code || "N/A"}`);
    console.error(`   Mensaje: ${error.message || "Error desconocido"}`);
    throw new Error(`Error al crear documento en '${collectionName}': ${error.message || "Error desconocido"}`);
  }
};

export const getDocument = async (collectionName: string, id: string) => {
  if (!db) {
    throw new Error("Firestore no está inicializado. Verifica la configuración de Firebase.");
  }
  
  try {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as any;
    }
    return null;
  } catch (error: any) {
    console.error(`Error al obtener documento de '${collectionName}':`, error);
    throw error;
  }
};

export const updateDocument = async (
  collectionName: string,
  id: string,
  data: any
) => {
  if (!db) {
    throw new Error("Firestore no está inicializado. Verifica la configuración de Firebase.");
  }
  
  // Limpiar datos eliminando valores undefined
  const cleanedData = removeUndefined(data);
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, cleanedData);
};

export const deleteDocument = async (collectionName: string, id: string) => {
  const docRef = doc(db, collectionName, id);
  await deleteDoc(docRef);
};

export const getDocuments = async (
  collectionName: string,
  constraints: QueryConstraint[] = []
) => {
  if (!db) {
    throw new Error("Firestore no está inicializado. Verifica la configuración de Firebase.");
  }
  
  try {
    const q = query(collection(db, collectionName), ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as any[];
  } catch (error: any) {
    // Si la colección no existe, retornar array vacío en lugar de error
    if (error.code === "not-found" || error.message?.includes("not found")) {
      console.log(`ℹ️ La colección '${collectionName}' no existe aún. Retornando array vacío.`);
      return [];
    }
    console.error(`Error al obtener documentos de '${collectionName}':`, error);
    throw error;
  }
};

export const getDocumentsByField = async (
  collectionName: string,
  field: string,
  value: any
) => {
  if (!db) {
    throw new Error("Firestore no está inicializado. Verifica la configuración de Firebase.");
  }
  
  try {
    return await getDocuments(collectionName, [where(field, "==", value)]);
  } catch (error: any) {
    // Si la colección no existe, retornar array vacío
    if (error.code === "not-found" || error.message?.includes("not found")) {
      console.log(`ℹ️ La colección '${collectionName}' no existe aún. Retornando array vacío.`);
      return [];
    }
    throw error;
  }
};

// Batch operations - use writeBatch directly from firebase/firestore
