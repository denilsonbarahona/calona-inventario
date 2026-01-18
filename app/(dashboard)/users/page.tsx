"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { User } from "@/types";
import {
  getDocuments,
  createDocument,
  deleteDocument,
  updateDocument,
} from "@/lib/firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/config";
import { canManageUsers } from "@/lib/utils/permissions";
import { convertFirestoreDate } from "@/lib/utils/dateHelpers";
import UserList from "@/app/components/users/UserList";
import UserForm from "@/app/components/users/UserForm";
import { Plus } from "lucide-react";
import { toast } from "react-toastify";

export default function UsersPage() {
  const { userData } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    if (userData && !canManageUsers(userData.role)) {
      router.push("/dashboard");
      return;
    }
    loadUsers();
  }, [userData, router]);

  const loadUsers = async () => {
    try {
      const data = await getDocuments("users");
      setUsers(
        data.map((u) => ({
          ...u,
          createdAt: convertFirestoreDate(u.createdAt),
        })) as User[]
      );
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: {
    email: string;
    password?: string;
    name: string;
    role: "admin" | "manager" | "cashier";
    branchId?: string;
  }) => {
    if (!userData || !data.password) return;

    try {
      // 1. Validar que el email no exista
      const { getDocumentsByField } = await import("@/lib/firebase/firestore");
      const existingUsers = await getDocumentsByField("users", "email", data.email);
      
      if (existingUsers.length > 0) {
        throw new Error("Ya existe un usuario con este email");
      }

      if(!data.branchId) {
        throw new Error("La sucursal es requerida");
      }

      // 2. Llamar a la Cloud Function para crear el usuario
      const createUserFunction = httpsCallable(functions, "createUser");
      
      const result = await createUserFunction({
        email: data.email,
        password: data.password,
        name: data.name,
        role: data.role,
        branchId: data.branchId,
      });

      // 3. Finalizar
      setShowForm(false);
      await loadUsers();
      toast.success("Usuario creado exitosamente");
      
    } catch (error: any) {
      console.error("Error al crear usuario:", error);
      
      // Manejar errores de la Cloud Function
      if (error.code === "already-exists") {
        throw new Error("Ya existe un usuario con este email");
      }
      
      if (error.code === "permission-denied") {
        throw new Error("No tienes permisos para crear usuarios");
      }
      
      throw new Error(error.message || "Error al crear usuario");
    }
  };

  const handleUpdate = async (data: {
    email: string;
    password?: string;
    name: string;
    role: "admin" | "manager" | "cashier";
    branchId?: string;
  }) => {
    if (!editingUser) return;

    try {
      await updateDocument("users", editingUser.id, {
        name: data.name,
        role: data.role,
        branchId: data.branchId,
      });

      setEditingUser(null);
      loadUsers();
    } catch (error: any) {
      throw new Error(error.message || "Error al actualizar usuario");
    }
  };

  const handleDelete = async (id: string) => {
    if (!userData) return;

    try {
      // Llamar a la Cloud Function para eliminar el usuario (Firestore + Auth)
      const deleteUserFunction = httpsCallable(functions, "deleteUser");
      
      await deleteUserFunction({ userId: id });

      await loadUsers();
      toast.success("Usuario eliminado exitosamente");
    } catch (error: any) {
      console.error("Error deleting user:", error);
      
      // Manejar errores de la Cloud Function
      if (error.code === "permission-denied") {
        toast.error(error.message || "No tienes permisos para eliminar usuarios");
      } else {
        toast.error(error.message || "Error al eliminar el usuario");
      }
    }
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Usuarios</h1>
        {canManageUsers(userData?.role || "cashier") && (
          <button
            onClick={() => {
              setEditingUser(null);
              setShowForm(true);
            }}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Nuevo Usuario</span>
          </button>
        )}
      </div>

      {(showForm || editingUser) && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            {editingUser ? "Editar Usuario" : "Nuevo Usuario"}
          </h2>
          <UserForm
            user={editingUser || undefined}
            onSubmit={editingUser ? handleUpdate : handleCreate}
            onCancel={() => {
              setShowForm(false);
              setEditingUser(null);
            }}
          />
        </div>
      )}

      <UserList
        users={users}
        onDelete={handleDelete}
        onEdit={setEditingUser}
        canEdit={canManageUsers(userData?.role || "cashier")}
      />
    </div>
  );
}
