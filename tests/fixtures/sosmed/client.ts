export class WorldApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function onAccountExpired() {}
export async function worldRequest<T>(
  operation: string,
  data: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch("/qa/" + operation, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-QA-User": new URLSearchParams(location.search).get("user") || "1",
    },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new WorldApiError(response.status, result.message);
  if ((window as any).loseResponse && ["post", "comment"].includes(String(data.action))) {
    (window as any).loseResponse = false;
    throw new Error("Respons terputus setelah tersimpan. Coba lagi.");
  }
  return result;
}
