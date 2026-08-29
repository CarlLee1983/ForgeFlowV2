import assert from "node:assert/strict";
import test from "node:test";

import { calculateOrderTotal } from "../src/order-total.js";

test("AC-01: sums line item prices in cents", () => {
  assert.equal(
    calculateOrderTotal([
      { unitPriceCents: 1_250, quantity: 2 },
      { unitPriceCents: 499, quantity: 1 },
    ]),
    2_999,
  );
});

test("AC-02: returns zero for an empty order", () => {
  assert.equal(calculateOrderTotal([]), 0);
});

test("AC-03: rejects invalid unit prices", () => {
  for (const unitPriceCents of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(
      () => calculateOrderTotal([{ unitPriceCents, quantity: 1 }]),
      {
        name: "RangeError",
        message: "unitPriceCents must be a non-negative integer",
      },
    );
  }
});

test("AC-04: rejects invalid quantities", () => {
  for (const quantity of [-1, 0, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(
      () => calculateOrderTotal([{ unitPriceCents: 100, quantity }]),
      {
        name: "RangeError",
        message: "quantity must be a positive integer",
      },
    );
  }
});

test("AC-05: rejects unsafe line totals", () => {
  assert.throws(
    () =>
      calculateOrderTotal([
        { unitPriceCents: Number.MAX_SAFE_INTEGER, quantity: 2 },
      ]),
    {
      name: "RangeError",
      message: "order total exceeds the safe integer range",
    },
  );
});

test("AC-06: rejects unsafe accumulated totals", () => {
  assert.throws(
    () =>
      calculateOrderTotal([
        { unitPriceCents: Number.MAX_SAFE_INTEGER, quantity: 1 },
        { unitPriceCents: 1, quantity: 1 },
      ]),
    {
      name: "RangeError",
      message: "order total exceeds the safe integer range",
    },
  );
});
