import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";

admin.initializeApp();

interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role: "admin" | "manager" | "cashier";
  branchId?: string;
}

export const createUser = functions.https.onCall(async (request) => {
  const data = request.data as CreateUserRequest;
  const auth = request.auth;
  
  // Verificar que el usuario esté autenticado
  if (!auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "El usuario debe estar autenticado para crear usuarios"
    );
  }

  // Verificar que el usuario tenga rol de admin
  const adminUser = await admin.firestore().collection("users").doc(auth.uid).get();
  const adminData = adminUser.data();
  
  if (!adminData || adminData.role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Solo los administradores pueden crear usuarios"
    );
  }

  // Validar datos de entrada
  if (!data.email || !data.password || !data.name || !data.role) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Email, contraseña, nombre y rol son requeridos"
    );
  }

  // Validar que el email no exista en Firestore
  const existingUsers = await admin
    .firestore()
    .collection("users")
    .where("email", "==", data.email)
    .get();

  if (!existingUsers.empty) {
    throw new functions.https.HttpsError(
      "already-exists",
      "Ya existe un usuario con este email"
    );
  }

  try {
    // Crear usuario en Firebase Auth usando Admin SDK
    const userRecord = await admin.auth().createUser({
      email: data.email,
      password: data.password,
      displayName: data.name,
    });

    const userId = userRecord.uid;

    // Crear documento en Firestore
    const userDocumentData: any = {
      email: data.email,
      name: data.name,
      role: data.role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Solo agregar branchId si tiene valor
    if (data.branchId && data.branchId.trim() !== "") {
      userDocumentData.branchId = data.branchId;
    }

    await admin.firestore().collection("users").doc(userId).set(userDocumentData);

    return {
      success: true,
      userId: userId,
      message: "Usuario creado exitosamente",
    };
  } catch (error: any) {
    console.error("Error al crear usuario:", error);
    
    if (error.code === "auth/email-already-exists") {
      throw new functions.https.HttpsError(
        "already-exists",
        "Ya existe un usuario con este email en el sistema de autenticación"
      );
    }

    throw new functions.https.HttpsError(
      "internal",
      error.message || "Error al crear usuario"
    );
  }
});

interface DeleteUserRequest {
  userId: string;
}

export const deleteUser = functions.https.onCall(async (request) => {
  const data = request.data as DeleteUserRequest;
  const auth = request.auth;
  
  // Verificar que el usuario esté autenticado
  if (!auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "El usuario debe estar autenticado para eliminar usuarios"
    );
  }

  // Verificar que el usuario tenga rol de admin
  const adminUser = await admin.firestore().collection("users").doc(auth.uid).get();
  const adminData = adminUser.data();
  
  if (!adminData || adminData.role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Solo los administradores pueden eliminar usuarios"
    );
  }

  // Validar datos de entrada
  if (!data.userId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "El ID del usuario es requerido"
    );
  }

  // No permitir que un admin se elimine a sí mismo
  if (data.userId === auth.uid) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "No puedes eliminar tu propia cuenta"
    );
  }

  try {
    // 1. Eliminar el documento de Firestore
    await admin.firestore().collection("users").doc(data.userId).delete();

    // 2. Eliminar la cuenta de Firebase Auth
    await admin.auth().deleteUser(data.userId);

    return {
      success: true,
      message: "Usuario eliminado exitosamente",
    };
  } catch (error: any) {
    console.error("Error al eliminar usuario:", error);
    
    if (error.code === "auth/user-not-found") {
      // Si no existe en Auth, solo eliminamos de Firestore (ya se hizo)
      return {
        success: true,
        message: "Usuario eliminado exitosamente (no existía en Auth)",
      };
    }

    throw new functions.https.HttpsError(
      "internal",
      error.message || "Error al eliminar usuario"
    );
  }
});
