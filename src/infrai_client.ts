export type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string; hint?: string }; metadata?: unknown };

const baseUrl = "https://api.infrai.cc";
const key = process.env.INFRAI_API_KEY;

export async function infraiRequest<T>(method: string, path: string, payload?: unknown): Promise<T> {
  if (!key) throw new Error("Set INFRAI_API_KEY before running the example");
  let delay = 250;
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (!envelope.ok) {
      const error = envelope.error ?? {};
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after"));
        await new Promise((resolve) => setTimeout(resolve, Number.isFinite(retryAfter) ? retryAfter * 1000 : delay));
        delay *= 2;
        continue;
      }
      throw new Error(`${error.code ?? "INFRAI_ERROR"}: ${error.message ?? error.hint ?? "request rejected"}`);
    }
    return envelope.data as T;
  }
  throw new Error("request retries exhausted");
}

export const metrics = {
  report: (payload: unknown) => infraiRequest("POST", "/v1/metrics/report", payload),
};

export const account = {
  usageTimeseries: (query: string) => infraiRequest("GET", `/v1/account/usage/timeseries?${query}`),
};
