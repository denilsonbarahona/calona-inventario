/**
 * Convierte un valor de fecha de Firestore a un objeto Date de JavaScript.
 * Maneja diferentes formatos: Timestamp de Firestore, Date, objeto serializado, string, número, etc.
 */
export const convertFirestoreDate = (dateValue: any): Date => {
  if (!dateValue) {
    return new Date();
  }

  // Si es un Timestamp de Firestore, convertir a Date
  if (typeof dateValue.toDate === "function") {
    return dateValue.toDate();
  }

  // Si ya es un Date, retornarlo directamente
  if (dateValue instanceof Date) {
    return dateValue;
  }

  // Si es un objeto con seconds (Timestamp serializado)
  if (typeof dateValue === "object" && dateValue.seconds) {
    return new Date(dateValue.seconds * 1000);
  }

  // Si es un string o número, crear Date
  if (typeof dateValue === "string" || typeof dateValue === "number") {
    return new Date(dateValue);
  }

  // Fallback: retornar fecha actual
  return new Date();
};
