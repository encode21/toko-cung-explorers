export class WorldApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function worldRequest<T>(
  operation: string,
  data?: Record<string, unknown>,
): Promise<T> {
  if (operation !== "pin-request" || !["setup", "reset"].includes(String(data?.purpose))) {
    throw new Error("Permintaan fixture tidak didukung.");
  }
  const scenario = new URLSearchParams(window.location.search).get("session");
  if (scenario === "auth-busy") await new Promise<void>(() => {});
  await new Promise<void>((resolve) => window.setTimeout(resolve, 650));
  if (scenario === "pin-request-error") {
    throw new Error("Kode belum terkirim. Coba lagi.");
  }
  return { message: "Kode terkirim ke notifikasi App.", retryAfter: 60 } as T;
}
