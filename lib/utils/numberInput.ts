/**
 * Valida que el valor sea un número válido (permite valores vacíos para backspace)
 * @param value - Valor del input
 * @param allowDecimals - Si permite decimales (para precios)
 * @returns true si es válido, false si no
 */
export const isValidNumberInput = (value: string, allowDecimals: boolean = false): boolean => {
  // Permitir valores vacíos (para backspace)
  if (value === "" || value === "-") {
    return true;
  }

  // Para enteros
  if (!allowDecimals) {
    return /^-?\d*$/.test(value);
  }

  // Para decimales
  return /^-?\d*\.?\d*$/.test(value);
};

/**
 * Convierte el valor del input a número, manejando valores vacíos
 * @param value - Valor del input
 * @param defaultValue - Valor por defecto si está vacío
 * @param allowDecimals - Si permite decimales
 * @returns Número o defaultValue
 */
export const parseNumberInput = (
  value: string,
  defaultValue: number = 0,
  allowDecimals: boolean = false
): number => {
  if (value === "" || value === "-") {
    return defaultValue;
  }

  if (allowDecimals) {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};
