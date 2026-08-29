export interface LineItem {
  unitPriceCents: number;
  quantity: number;
}

export function calculateOrderTotal(items: readonly LineItem[]): number {
  return items.reduce((total, item) => {
    if (!Number.isSafeInteger(item.unitPriceCents) || item.unitPriceCents < 0) {
      throw new RangeError("unitPriceCents must be a non-negative integer");
    }

    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
      throw new RangeError("quantity must be a positive integer");
    }

    const lineTotal = item.unitPriceCents * item.quantity;
    const nextTotal = total + lineTotal;

    if (!Number.isSafeInteger(nextTotal)) {
      throw new RangeError("order total exceeds the safe integer range");
    }

    return nextTotal;
  }, 0);
}
