"use client";

import { useState, useEffect } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { onAuthChange } from "@/lib/firebase/auth";
import { getDocument } from "@/lib/firebase/firestore";
import { User } from "@/types";

export const useAuth = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userDoc = await getDocument("users", firebaseUser.uid);
          if (userDoc) {
            const { createdAt: _createdAt, ...rest } = userDoc;
            setUserData({
              ...rest,
            } as User);
          } else {
            // Si no existe el documento, crear uno básico
            console.warn(
              "Usuario autenticado pero sin documento en Firestore. Creando documento básico...",
            );
            try {
              const { doc, setDoc } = await import("firebase/firestore");
              const { db } = await import("@/lib/firebase/config");

              const basicUserData = {
                email: firebaseUser.email || "",
                name:
                  firebaseUser.displayName ||
                  firebaseUser.email?.split("@")[0] ||
                  "Usuario",
                role: "cashier" as const,
              };

              await setDoc(doc(db, "users", firebaseUser.uid), basicUserData);

              setUserData({
                id: firebaseUser.uid,
                ...basicUserData,
              } as User);
            } catch (createError) {
              console.error("Error al crear documento básico:", createError);
              // Aún así permitimos el acceso con datos mínimos
              setUserData({
                id: firebaseUser.uid,
                email: firebaseUser.email || "",
                name:
                  firebaseUser.displayName ||
                  firebaseUser.email?.split("@")[0] ||
                  "Usuario",
                role: "cashier",
              } as User);
            }
          }
        } catch (error) {
          console.error("Error al cargar datos del usuario:", error);
          // Aún así permitimos el acceso con datos mínimos del Auth
          setUserData({
            id: firebaseUser.uid,
            email: firebaseUser.email || "",
            name:
              firebaseUser.displayName ||
              firebaseUser.email?.split("@")[0] ||
              "Usuario",
            role: "cashier",
          } as User);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, userData, loading };
};
