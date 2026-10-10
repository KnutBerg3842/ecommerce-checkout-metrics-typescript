import assert from "node:assert/strict";
import { checkoutBody, checkoutDecision } from "./checkout_metrics.ts";

const order = checkoutBody.parse({ orderId: "o1", customerId: "c1", totalCents: 500, fulfillment: "queued", receiptId: "r1" });
assert.equal(checkoutDecision(order), "ship");
assert.equal(checkoutDecision({ ...order, totalCents: 0 }), "hold");
console.log("checkout decision test passed");
