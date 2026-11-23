import { EntryTitleScreen } from "@/ui/entry/EntryTitleScreen";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { restoreAccount, useAccount } from "@/auth/useSession";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  pendingMs: 0,
  pendingComponent: () => <EntryTitleScreen status="Menyiapkan profil…" />,
  beforeLoad: async () => {
    await restoreAccount(true);
    const { user } = useAccount.getState();
    if (!user) throw redirect({ to: "/auth" });
    return { user };
  },
  component: () => <Outlet />,
});
