"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { getDocument } from "@/lib/firebase/firestore";
import { db } from "@/lib/firebase/config";

export default function FirestoreCheckPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<{
    firestoreInitialized: boolean;
    userDocExists: boolean;
    userDocData: any;
    error: string | null;
  }>({
    firestoreInitialized: false,
    userDocExists: false,
    userDocData: null,
    error: null,
  });

  useEffect(() => {
    const checkFirestore = async () => {
      try {
        // Check if Firestore is initialized
        const firestoreInitialized = !!db;
        setStatus((prev) => ({ ...prev, firestoreInitialized }));

        if (!user) {
          setStatus((prev) => ({
            ...prev,
            error: "No hay usuario autenticado",
          }));
          return;
        }

        // Check if user document exists
        const userDoc = await getDocument("users", user.uid);
        const userDocExists = !!userDoc;

        setStatus({
          firestoreInitialized,
          userDocExists,
          userDocData: userDoc,
          error: null,
        });
      } catch (error: any) {
        setStatus((prev) => ({
          ...prev,
          error: error.message || "Error desconocido",
        }));
      }
    };

    checkFirestore();
  }, [user]);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Verificación de Firestore</h1>

      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Estado de Firestore</h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Firestore inicializado:</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  status.firestoreInitialized
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {status.firestoreInitialized ? "✅ Sí" : "❌ No"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-700">Usuario autenticado:</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  user ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }`}
              >
                {user ? `✅ ${user.email}` : "❌ No"}
              </span>
            </div>

            {user && (
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Documento de usuario existe:</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    status.userDocExists
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {status.userDocExists ? "✅ Sí" : "❌ No"}
                </span>
              </div>
            )}

            {status.error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <strong>Error:</strong> {status.error}
              </div>
            )}
          </div>
        </div>

        {user && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Información del Usuario</h2>
            <div className="space-y-2">
              <p>
                <strong>UID:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{user.uid}</code>
              </p>
              <p>
                <strong>Email:</strong> {user.email}
              </p>
            </div>
          </div>
        )}

        {status.userDocData && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Datos del Documento</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(status.userDocData, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Cómo verificar en Firebase Console</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-700">
            <li>Ve a <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Firebase Console</a></li>
            <li>Selecciona tu proyecto</li>
            <li>Ve a <strong>Firestore Database</strong></li>
            <li>Busca la colección <code className="bg-blue-100 px-1 rounded">users</code></li>
            <li>Deberías ver un documento con el ID igual al UID del usuario</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
