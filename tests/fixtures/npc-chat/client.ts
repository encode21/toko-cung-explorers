export class WorldApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function onAccountExpired(_handler: () => void) {}
export async function worldRequest<T>(
  operation: string,
  data: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(`/qa/${operation}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new WorldApiError(response.status, result.message);
  const fixture = window as unknown as { loseNextNpcResponse?: boolean };
  if (fixture.loseNextNpcResponse && data.action === "npc_chat") {
    fixture.loseNextNpcResponse = false;
    throw new Error("Respons terputus setelah tersimpan. Coba kirim lagi.");
  }
  return result;
}
