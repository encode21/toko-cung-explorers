export async function worldRequest(operation: string) {
  const w = window as any;
  w.introCalls = (w.introCalls ?? 0) + 1;
  if (w.failSave) throw new Error("offline");
  if (operation !== "intro-complete") throw new Error("Unexpected operation");
  await new Promise((resolve) => setTimeout(resolve, 25));
  return { introSeenAt: "2026-10-13T15:00:00+00:00" };
}
