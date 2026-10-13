export async function gameCommand({ data }: { data: any }) {
  const w = window as any;
  const snapshot = structuredClone(w.core.getState().snapshot);
  if (data.action === "cancel") snapshot.active = null;
  return snapshot;
}
