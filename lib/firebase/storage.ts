import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./config";

export const uploadImage = async (file: File, path: string): Promise<string> => {
  if (!storage) {
    throw new Error("Firebase Storage no está inicializado. Verifica la configuración.");
  }

  try {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (error: any) {
    console.error("Error en uploadImage:", error);
    // Re-lanzar el error con más contexto
    throw new Error(`Error al subir imagen: ${error.message || error.code || "Error desconocido"}`);
  }
};

export const deleteImage = async (path: string): Promise<void> => {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
};

export const getImageUrl = async (path: string): Promise<string> => {
  const storageRef = ref(storage, path);
  return await getDownloadURL(storageRef);
};
