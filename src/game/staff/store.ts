import { create } from "zustand";
import { createId } from "@/lib/id";
import { worldRequest, WorldApiError } from "@/services/world/client";
import { useAccount } from "@/auth/useSession";
import { receiveOfflineSales, useWarung, warungCommand } from "@/game/warung/store";
import { useUsaha, usahaCommand } from "@/game/usaha/store";
import { storyCommand } from "@/game/story/store";
import type { StaffCommand, StaffData, StaffSnapshot } from "./types";

export const useStaff = create<{
  data: StaffData | null;
  busy: boolean;
  error: string;
  retry: StaffCommand | null;
}>(() => ({ data: null, busy: false, error: "", retry: null }));
let generation = 0;
let refreshPending = false;
export function clearStaff() {
  generation++;
  refreshPending = false;
  useStaff.setState({ data: null, busy: false, error: "", retry: null });
}

export async function staffCommand(
  action: StaffCommand["action"],
  extra: Partial<StaffCommand> = {},
) {
  const account = useAccount.getState().user;
  if (!account) return;
  if (useStaff.getState().busy) {
    if (action === "state") refreshPending = true;
    return;
  }
  if (useStaff.getState().retry && !extra.requestId) return;
  const ticket = generation;
  const request: StaffCommand = { action, requestId: createId(), ...extra };
  useStaff.setState({ busy: true, error: "" });
  try {
    const data = await worldRequest<StaffSnapshot>("staff", request);
    if (ticket !== generation || account.id !== useAccount.getState().user?.id) return;
    useStaff.setState({ data: data.enabled ? data : null, retry: null });
    if (data.enabled && data.offlineSales)
      receiveOfflineSales(data.offlineSales, !useWarung.getState().data);
    if (data.enabled && data.kas !== null) {
      const cash = data.kas;
      useWarung.setState((s) =>
        s.data?.warung && s.data.warung.cash !== cash
          ? { data: { ...s.data, warung: { ...s.data.warung, cash } } }
          : {},
      );
      useUsaha.setState((s) =>
        s.data && s.data.kas !== cash ? { data: { ...s.data, kas: cash } } : {},
      );
    }
    if (action !== "state" && data.enabled) {
      void warungCommand("read");
      if (useUsaha.getState().data) void usahaCommand("read");
      void storyCommand("state");
    }
    return data;
  } catch (e) {
    if (ticket !== generation || account.id !== useAccount.getState().user?.id) return;
    // Backend is released first; an older server hides the optional panel cleanly.
    if (e instanceof WorldApiError && e.status === 404) {
      useStaff.setState({ data: null, retry: null });
    } else {
      useStaff.setState({
        error: e instanceof Error ? e.message : "",
        retry: e instanceof WorldApiError && e.status < 500 ? null : request,
      });
    }
  } finally {
    if (ticket === generation && account.id === useAccount.getState().user?.id) {
      useStaff.setState({ busy: false });
      if (refreshPending && !useStaff.getState().retry) {
        refreshPending = false;
        void staffCommand("state");
      }
    }
  }
  return undefined;
}
export function retryStaff() {
  const request = useStaff.getState().retry;
  if (request) return staffCommand(request.action, request);
  return undefined;
}
