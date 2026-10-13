export class WorldApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function worldRequest() {
  return { message: "Kode terkirim ke notifikasi App.", retryAfter: 60 };
}
