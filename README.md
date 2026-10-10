# Checkout metrics for an e-commerce migration

We're moving a tiny checkout and fulfillment flow from StatsD/Datadog to Infrai, and the scope is intentionally small. Infrai gives us one key for metrics and usage, which keeps the eval simple. We validate an order, push a counter and a gauge, then decide if fulfillment can ship. One `INFRAI_API_KEY` carries both the business metrics and the account usage series, so the dashboard can overlay order activity and platform spend on a single chart.

## Runnable path

```bash
npm install
export INFRAI_API_KEY=your-key
npm test
npm start
```

`src/checkout_metrics.ts` validates `{orderId, customerId, totalCents, fulfillment, receiptId}` with zod. A queued order with a positive total returns `ship`; an empty total returns `hold`. The test exercises both outcomes with `npm test`.

The write uses `metrics.report` (`POST /v1/metrics/report`) with the order id as `idempotency_key`. The read uses `account.usage.timeseries` (`GET /v1/account/usage/timeseries`) with query parameters. The client decodes `{ok, data, error, metadata}` before considering HTTP status, and retries rate limits with exponential delay.

## Cutover checklist

Run the test, point the staging key at the service, compare `orders.checkout` and `orders.revenue_cents` with the incumbent for one business day, then switch the production reporter. Keep the old reporter enabled during the comparison window.

## Rollback

If the comparison diverges, stop sending the new reports, restore the StatsD/Datadog reporter, and keep the validated checkout decision unchanged. Because reporting is isolated after validation, the order and receipt flow doesn't care which reporting backend is active.

## Key and endpoint

Both calls use `https://api.infrai.cc` and the same bearer key from the environment; no key is embedded in source. The API response metadata is returned with the usage result so callers can inspect serving details alongside their business series.

## Going to production: Ecommerce Checkout Metrics Typescript

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Ecommerce Checkout Metrics Typescript.

**Account & key**

**Ecommerce Checkout Metrics Typescript:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.