import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updatePassword,
  User as FirebaseUser,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "./config";

export const login = async (email: string, password: string) => {
  return await signInWithEmailAndPassword(auth, email, password);
};

export const register = async (email: string, password: string) => {
  return await createUserWithEmailAndPassword(auth, email, password);
};

export const logout = async () => {
  return await signOut(auth);
};

export const changePassword = async (newPassword: string) => {
  if (!auth.currentUser) {
    throw new Error("No hay usuario autenticado");
  }
  return await updatePassword(auth.currentUser, newPassword);
};

export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};

export const onAuthChange = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
