import { StoryIntro } from "@/ui/intro/StoryIntro";
import { completeIntro, retryIntroCompletion, useIntro } from "@/state/intro-store";
import { LandscapeOrientationGuard } from "@/ui/game-ui/LandscapeOrientationGuard";
import { useWorldEditor } from "@/game/editor/store";
import { dungeonCommand } from "@/game/dungeon/store";
import { useWorldViewport } from "@/hooks/use-world-viewport";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { GameCanvas } from "@/game/engine/GameCanvas";
import { GameUi } from "@/ui/GameUi";
import { useNet } from "@/net/net-store";
import { useProfile } from "@/identity/profile-store";
import { useSession, logoutAccount } from "@/auth/useSession";
import { useChannels, renewChannel, leaveChannel, joinChannel } from "@/net/channel-store";
import { pageMeta } from "@/lib/site-meta";
import { WorldLobby } from "@/ui/entry/WorldLobby";
import { ActionButton } from "@/ui/adventure/ActionButton";
export const Route = createFileRoute("/_authenticated/world")({
  ssr: false,
  head: () => ({
    meta: pageMeta({
      title: "Toko Cung World — Pilih Petualanganmu",
      description: "Pilih channel, temui Nakama, dan jelajahi dunia.",
      path: "/world",
    }),
  }),
  component: WorldPage,
});
function WorldPage() {
  const introDismissed = useIntro((s) => s.dismissed);
  const introPending = useIntro((s) => s.pending);
  const introAccount = useIntro((s) => s.accountId);
  const [replayIntro, setReplayIntro] = useState(false);
  const showingIntro = !introDismissed || replayIntro;
  useEffect(() => {
    setReplayIntro(false);
  }, [introAccount]);
  useEffect(() => {
    if (!introPending) return;
    const retry = () => {
      if (!document.hidden) void retryIntroCompletion();
    };
    retry();
    const timer = window.setInterval(retry, 15000);
    window.addEventListener("online", retry);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", retry);
    };
  }, [introPending, introAccount]);
  const editorMode = useWorldEditor((s) => s.mode === "EDITOR");
  const viewportRef = useWorldViewport();
  const lease = useChannels((s) => s.lease);
  const playing = useChannels((s) => s.playing);
  const sceneReady = useChannels((s) => s.sceneReady);
  const connected = useNet((s) => s.connected);
  const connectionError = useNet((s) => s.connectionError);
  const joining = useChannels((s) => s.busy);
  const profile = useProfile((s) => s.profile);
  const session = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useEffect(() => {
    if (session.initialized && !session.loading && !session.user)
      void navigate({ to: "/auth", replace: true });
  }, [session.initialized, session.loading, session.user, navigate]);
  const [loggingOut, setLoggingOut] = useState(false);
  const [exitError, setExitError] = useState("");
  const [slow, setSlow] = useState(false);
  const channelId = lease?.channel;
  useEffect(() => {
    if (!showingIntro && profile?.id && !useChannels.getState().lease)
      void dungeonCommand("resume");
  }, [profile?.id, showingIntro]);
  useEffect(() => {
    if (profile) useNet.getState().setName(profile.displayName);
  }, [profile]);
  // Scene ready is enough to enter play; multiplayer can finish in the background
  // (ConnectionStatus handles reconnect). Requiring `connected` left users stuck
  // on "Memuat channel" when Realtime was slow or failed after HMR.
  useEffect(() => {
    if (lease && sceneReady) useChannels.setState({ playing: true });
  }, [lease, sceneReady]);
  useEffect(() => {
    setSlow(false);
    if (!channelId || playing) return;
    const timer = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(timer);
  }, [channelId, playing]);
  useEffect(() => {
    const timer = setInterval(() => void renewChannel(), 25000);
    return () => {
      clearInterval(timer);
      void leaveChannel();
    };
  }, []);
  const signOut = async () => {
    setLoggingOut(true);
    setExitError("");
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      // Release channel lease before cookie clears — avoids blocking the next account.
      await leaveChannel();
      await logoutAccount();
      await navigate({ to: "/auth", replace: true });
    } catch (e) {
      setExitError(e instanceof Error ? e.message : "Gagal keluar. Coba lagi.");
    } finally {
      setLoggingOut(false);
    }
  };
  return (
    <main
      ref={viewportRef}
      className="world-viewport overflow-hidden bg-background"
      data-game-viewport
    >
      {showingIntro ? (
        <StoryIntro
          key={introAccount ?? "intro"}
          replay={replayIntro}
          onFinish={() => {
            if (replayIntro) setReplayIntro(false);
            else completeIntro();
          }}
        />
      ) : (
        <LandscapeOrientationGuard disabled={editorMode}>
          {lease && session.user && (
            <>
              <GameCanvas />
              {!editorMode && <GameUi mobileControlsEnabled={playing} />}
            </>
          )}
          {!lease && (
            <WorldLobby
              onReplayIntro={() => setReplayIntro(true)}
              loggingOut={loggingOut}
              exitError={exitError}
              onSignOut={() => void signOut()}
            />
          )}
          {lease && !playing && (
            <div className="game-loading" data-ui-panel>
              <section className="game-loading-panel" role="status" aria-live="polite">
                <p className="adventure-eyebrow text-world-accent">
                  {lease.channel.startsWith("DNG-")
                    ? "PRINCIPAL DUNGEON"
                    : lease.channel.replace("-", " ")}
                </p>
                <h2 className="mt-3 font-display text-4xl text-[#fff8ef]">
                  {lease.channel.startsWith("DNG-")
                    ? "MEMASUKI PRINCIPAL DUNGEON…"
                    : "PETUALANGAN MENUNGGU"}
                </h2>
                <ol className="my-7 space-y-3">
                  {[
                    { label: "Menyiapkan profil", done: !!profile },
                    { label: "Bergabung ke channel", done: !!lease },
                    { label: "Memuat dunia", done: sceneReady },
                    {
                      label: connected ? "Multiplayer tersambung" : "Multiplayer (lanjut di latar)",
                      done: connected || sceneReady,
                    },
                  ].map((step, i) => (
                    <li
                      key={step.label}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
                        step.done ? "bg-white/5 text-[#fff8ef]" : "bg-black/25 text-[#fff8ef]/90"
                      }`}
                    >
                      <span
                        className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                          step.done
                            ? "bg-world-accent text-world-accent-foreground"
                            : "border border-white/25 text-[#fff8ef]"
                        }`}
                      >
                        {step.done ? <Check className="size-4" /> : i + 1}
                      </span>
                      <span className="min-w-0 flex-1 font-medium leading-snug">{step.label}</span>
                      {!step.done && (
                        <LoaderCircle className="size-4 shrink-0 animate-spin text-world-accent motion-reduce:animate-none" />
                      )}
                    </li>
                  ))}
                </ol>
                {slow && <p className="mb-4 text-sm text-[#fff8ef]/70">Masih diproses…</p>}
                {connectionError && (
                  <p role="alert" className="mb-4 text-sm text-red-200">
                    {connectionError}
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  {connectionError && (
                    <ActionButton
                      busy={joining}
                      busyLabel="Menghubungkan…"
                      onClick={() => void joinChannel(lease.channel)}
                    >
                      Coba lagi
                    </ActionButton>
                  )}
                  <ActionButton className="adventure-secondary" onClick={() => void leaveChannel()}>
                    Kembali ke channel
                  </ActionButton>
                </div>
              </section>
            </div>
          )}
        </LandscapeOrientationGuard>
      )}
    </main>
  );
}
