/**
 * Formatea un número como moneda: símbolo L, comas para miles/millones, 2 decimales.
 * Ejemplo: 1234567.89 → "L1,234,567.89"
 */
export function formatCurrency(value: number): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "L0.00";
  const num = value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `L${num}`;
}
