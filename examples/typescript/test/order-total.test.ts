import assert from "node:assert/strict";
import test from "node:test";

import { calculateOrderTotal } from "../src/order-total.js";

test("sums line item prices in cents", () => {
  assert.equal(
    calculateOrderTotal([
      { unitPriceCents: 1_250, quantity: 2 },
      { unitPriceCents: 499, quantity: 1 },
    ]),
    2_999,
  );
});

test("returns zero for an empty order", () => {
  assert.equal(calculateOrderTotal([]), 0);
});

test("rejects invalid prices and quantities", () => {
  assert.throws(
    () => calculateOrderTotal([{ unitPriceCents: -1, quantity: 1 }]),
    /non-negative integer/,
  );
  assert.throws(
    () => calculateOrderTotal([{ unitPriceCents: 100, quantity: 0 }]),
    /positive integer/,
  );
});
