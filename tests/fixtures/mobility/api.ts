import { worldRequest as fixtureRequest } from "../obby/client";
/** Only replaces the server-function boundary. Production worldRequest/error handling runs. */
export async function worldApi({
  data,
}: {
  data: { operation: string; data?: Record<string, unknown> };
}) {
  if (data.operation !== "mobility")
    return { ok: true, value: await fixtureRequest(data.operation, data.data) };
  const response = await fetch("/mobility-api/api/world/mobility", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data.data),
  });
  const value = await response.json();
  return response.ok
    ? { ok: true, value }
    : { ok: false, status: response.status, message: value.message };
}
