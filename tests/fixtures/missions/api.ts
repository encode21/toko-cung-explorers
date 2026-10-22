/** Replace only the server-function boundary; production client and error translation run. */
export async function worldApi({
  data,
}: {
  data: { operation: string; data?: Record<string, unknown> };
}) {
  const response = await fetch(`/mission-api/api/world/${data.operation}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data.data),
  });
  const value = await response.json();
  return response.ok
    ? { ok: true, value }
    : { ok: false, status: response.status, message: value.message };
}
