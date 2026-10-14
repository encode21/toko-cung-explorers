import { create } from "zustand";
export const useSession = create(() => ({
  user: { id: "alice" },
  loading: false,
  initialized: true,
}));
export async function logoutAccount() {
  useSession.setState({ user: null });
}
