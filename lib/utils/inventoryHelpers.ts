import type {
  ProductVariation,
  ProductVariationWithQuantity,
  InventoryWarehouse,
  InventoryWarehouseRow,
} from "@/types";

const DEFAULT_VARIATION: ProductVariation = {
  id: "default",
  type: "default",
  value: "Único",
};

/**
 * Normaliza un doc de Firestore al formato con variations que incluyen quantity.
 * Compatible con legacy: variationQuantities + variations, o variation + quantity.
 */
export function normalizeWarehouseDoc(
  doc: Record<string, unknown> & { id: string },
): InventoryWarehouse {
  const raw = doc as unknown as Record<string, unknown> & { id: string };

  // Formato nuevo: variations[] con quantity en cada una
  const variationsArray = raw.variations as
    | (ProductVariation & { quantity?: number })[]
    | undefined;
  if (
    Array.isArray(variationsArray) &&
    variationsArray.length > 0 &&
    variationsArray.every(
      (v) => typeof v === "object" && v != null && "quantity" in v,
    )
  ) {
    return raw as unknown as InventoryWarehouse;
  }

  // Legacy 1: variationQuantities + variations (sin quantity en cada variación)
  const hasLegacyQuantities =
    "variationQuantities" in raw &&
    raw.variationQuantities !== undefined &&
    typeof raw.variationQuantities === "object";
  if (hasLegacyQuantities) {
    const qtyMap = raw.variationQuantities as Record<string, number>;
    const vars = (raw.variations as ProductVariation[]) ?? [DEFAULT_VARIATION];
    const variationsWithQty: ProductVariationWithQuantity[] = Object.entries(
      qtyMap ?? {},
    ).map(([variationId, quantity]) => {
      const v = vars.find((x) => x.id === variationId) ?? {
        id: variationId,
        type: "?",
        value: "?",
      };
      return { ...v, quantity: quantity ?? 0 };
    });
    if (variationsWithQty.length === 0 && vars.length > 0) {
      variationsWithQty.push({
        ...(vars[0] ?? DEFAULT_VARIATION),
        quantity: (qtyMap as Record<string, number>)["default"] ?? 0,
      });
    }
    return {
      ...raw,
      variations: variationsWithQty,
      hasVariations:
        (raw.hasVariations as boolean) ??
        variationsWithQty.filter((v) => v.id !== "default").length > 1,
    } as unknown as InventoryWarehouse;
  }

  // Legacy 2: doc tiene variation y quantity (un doc = un SKU)
  const legacy = raw as {
    id: string;
    warehouseId: string;
    name: string;
    type: string;
    category?: string;
    taxStatus: string;
    priceIncludesTax: boolean;
    barcode?: string;
    condition?: string;
    images: string[];
    variations?: ProductVariation[];
    variation?: ProductVariation | null;
    quantity: number;
    purchasePrice: number;
    salePrice: number;
    lastUpdated: unknown;
  };
  const variation = legacy.variation ?? null;
  const vars = legacy.variations?.length
    ? legacy.variations
    : [DEFAULT_VARIATION];
  const variationId = variation?.id ?? "default";
  const variations: ProductVariationWithQuantity[] = vars.map((v) => ({
    ...v,
    quantity: v.id === variationId ? (legacy.quantity ?? 0) : 0,
  }));
  if (variations.length === 0) {
    variations.push({
      ...DEFAULT_VARIATION,
      quantity: legacy.quantity ?? 0,
    });
  }
  return {
    id: legacy.id,
    warehouseId: legacy.warehouseId,
    name: legacy.name,
    type: legacy.type,
    category: legacy.category,
    taxStatus: legacy.taxStatus,
    priceIncludesTax: legacy.priceIncludesTax ?? true,
    barcode: legacy.barcode,
    condition: legacy.condition,
    images: legacy.images ?? [],
    hasVariations: variation != null && variation.id !== "default",
    variations,
    purchasePrice: legacy.purchasePrice,
    salePrice: legacy.salePrice,
    lastUpdated: legacy.lastUpdated as Date,
  };
}

/**
 * Aplana un documento de bodega (un producto) en filas para listados/transferencias.
 * Una fila por variación con cantidad (lee de doc.variations[].quantity).
 */
export function flattenWarehouseProduct(
  doc: InventoryWarehouse,
): InventoryWarehouseRow[] {
  const base = {
    id: doc.id,
    warehouseId: doc.warehouseId,
    name: doc.name,
    type: doc.type,
    category: doc.category,
    taxStatus: doc.taxStatus,
    priceIncludesTax: doc.priceIncludesTax,
    barcode: doc.barcode,
    condition: doc.condition,
    images: doc.images,
    variations: doc.variations,
    purchasePrice: doc.purchasePrice,
    salePrice: doc.salePrice,
    lastUpdated: doc.lastUpdated,
  };

  const variationsWithQty = doc.variations ?? [];
  if (doc.hasVariations) {
    return variationsWithQty
      .filter((v) => (v.quantity ?? 0) > 0)
      .map((v) => {
        const { quantity, ...variation } = v;
        return {
          ...base,
          rowId: `${doc.id}_${v.id}`,
          variation,
          quantity: quantity ?? 0,
        };
      });
  }

  const first = variationsWithQty[0];
  const variation = first
    ? { id: first.id, type: first.type, value: first.value, sku: first.sku }
    : DEFAULT_VARIATION;
  const quantity = first?.quantity ?? 0;
  return [
    {
      ...base,
      rowId: doc.id,
      variation,
      quantity,
    },
  ];
}

/** Cantidad para un variationId en un doc de bodega (lee de variations[].quantity). */
export function getQuantityByVariation(
  doc: InventoryWarehouse,
  variationId: string,
): number {
  return doc.variations?.find((v) => v.id === variationId)?.quantity ?? 0;
}

/**
 * Obtiene la variación a mostrar para un ítem de inventario.
 * Compatible con datos legacy y filas aplanadas (variation + quantity).
 */
export function getDisplayVariation(item: {
  variation?: ProductVariation | null;
  variations?: ProductVariation[] | null;
}): ProductVariation | null {
  if (item.variation !== undefined && item.variation !== null)
    return item.variation;
  if (item.variations?.length === 1) return item.variations[0];
  return null;
}

/** Texto corto para mostrar variación (ej: "Talla: M") */
export function getVariationLabel(item: {
  variation?: ProductVariation | null;
  variations?: ProductVariation[] | null;
}): string {
  const v = getDisplayVariation(item);
  if (!v) return "";
  return `${v.type}: ${v.value}`;
}

/** Compara dos variaciones (mismo SKU si mismo tipo+valor o mismo id). */
export function isSameVariation(
  a: ProductVariation | null | undefined,
  b: ProductVariation | null | undefined,
): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (a.id && b.id && a.id === b.id) return true;
  return a.type === b.type && a.value === b.value;
}
