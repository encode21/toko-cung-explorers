import { AdventureShell } from "@/ui/adventure/AdventureShell";
import { AdventureSkeleton } from "@/ui/adventure/ActionButton";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { restoreAccount, useAccount } from "@/auth/useSession";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  pendingMs: 0,
  pendingComponent: () => (
    <AdventureShell chapter="Menyiapkan profil">
      <div className="adventure-panel mx-auto max-w-lg">
        <AdventureSkeleton label="Menyiapkan profil…" />
      </div>
    </AdventureShell>
  ),
  beforeLoad: async () => {
    await restoreAccount(true);
    const { user } = useAccount.getState();
    if (!user) throw redirect({ to: "/auth" });
    return { user };
  },
  component: () => <Outlet />,
});
