import { z } from "zod";
import { account, metrics } from "./infrai_client.ts";

export const checkoutBody = z.object({
  orderId: z.string().min(1),
  customerId: z.string().min(1),
  totalCents: z.number().int().nonnegative(),
  fulfillment: z.enum(["queued", "shipped", "delivered"]),
  receiptId: z.string().min(1),
});
export type Checkout = z.infer<typeof checkoutBody>;

export function checkoutDecision(order: Checkout): "ship" | "hold" {
  return order.fulfillment === "queued" && order.totalCents > 0 ? "ship" : "hold";
}

export async function reportCheckout(input: unknown) {
  const order = checkoutBody.parse(input);
  const decision = checkoutDecision(order);
  await metrics.report({ name: "orders.checkout", type: "counter", value: 1, tags: { fulfillment: order.fulfillment }, idempotency_key: `${order.orderId}:checkout` });
  await metrics.report({ name: "orders.revenue_cents", type: "gauge", value: order.totalCents, tags: { decision }, idempotency_key: `${order.orderId}:revenue` });
  const usage = await account.usageTimeseries(`group_by=day&capability=metrics`);
  return { orderId: order.orderId, receiptId: order.receiptId, decision, usage };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sample = { orderId: "ord-1001", customerId: "cus-7", totalCents: 1299, fulfillment: "queued", receiptId: "rcpt-1001" };
  reportCheckout(sample).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
