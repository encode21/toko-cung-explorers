import { dungeonCommand } from "@/game/dungeon/store";
import { ASSET_CREDITS } from "@/assets/game-assets";
import { useWorldViewport } from "@/hooks/use-world-viewport";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Check, LoaderCircle, Shield } from "lucide-react";
import { GameCanvas } from "@/game/engine/GameCanvas";
import { GameUi } from "@/ui/GameUi";
import { useNet } from "@/net/net-store";
import { useProfile } from "@/identity/profile-store";
import { useSession, logoutAccount } from "@/auth/useSession";
import { ChannelSelector } from "@/ui/ChannelSelector";
import { useChannels, renewChannel, leaveChannel, joinChannel } from "@/net/channel-store";
import { pageMeta } from "@/lib/site-meta";
import { AdventureShell } from "@/ui/adventure/AdventureShell";
import { ActionButton, AdventureSkeleton } from "@/ui/adventure/ActionButton";
import { GameProgress } from "@/ui/hud/GameProgress";
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
  const viewportRef = useWorldViewport();
  const lease = useChannels((s) => s.lease);
  const playing = useChannels((s) => s.playing);
  const sceneReady = useChannels((s) => s.sceneReady);
  const connected = useNet((s) => s.connected);
  const connectionError = useNet((s) => s.connectionError);
  const joining = useChannels((s) => s.busy);
  const profile = useProfile((s) => s.profile);
  const saving = useProfile((s) => s.saving);
  const profileError = useProfile((s) => s.error);
  const session = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [exitError, setExitError] = useState("");
  const [slow, setSlow] = useState(false);
  const channelId = lease?.channel;
  useEffect(() => {
    if (profile?.id && !useChannels.getState().lease) void dungeonCommand("resume");
  }, [profile?.id]);
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
      className={lease ? "world-viewport overflow-hidden bg-background" : "min-h-dvh bg-background"}
    >
      {lease && session.user && (
        <>
          <GameCanvas />
          <GameUi mobileControlsEnabled={playing} />
        </>
      )}
      {!lease && (
        <AdventureShell chapter="Lobby / 02">
          <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
            <section className="adventure-panel">
              <p className="adventure-eyebrow">Identitas penjelajah</p>
              <div className="my-7 flex items-center gap-4">
                <div className="grid size-16 place-items-center rounded-2xl border border-world-brand/40 bg-world-brand/15">
                  <Shield className="size-8 text-world-accent" />
                </div>
                <div>
                  <p className="text-xs text-world-muted">Selamat datang kembali</p>
                  <h1 className="font-display text-4xl">{profile?.displayName || "Penjelajah"}</h1>
                </div>
              </div>
              {!profile ? (
                <AdventureSkeleton label="Menyiapkan profil…" />
              ) : (
                <>
                  <GameProgress />
                  <button
                    className="mt-5 min-h-11 text-sm text-world-accent underline"
                    onClick={() => {
                      setDraft(profile.displayName);
                      setEditing(!editing);
                    }}
                  >
                    Ubah nama pemain
                  </button>
                  {editing && (
                    <form
                      className="my-3 space-y-3"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (saving) return;
                        const error = await useProfile
                          .getState()
                          .save({ displayName: draft.trim() });
                        if (!error) setEditing(false);
                      }}
                    >
                      <label className="block text-sm">
                        Nama pemain
                        <input
                          required
                          maxLength={18}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          className="mt-2 min-h-12 w-full rounded-lg border px-3"
                        />
                      </label>
                      <ActionButton type="submit" busy={saving} busyLabel="Menyimpan…">
                        Simpan nama
                      </ActionButton>
                    </form>
                  )}
                </>
              )}
              {profileError && (
                <p role="alert" className="text-sm text-red-200">
                  {profileError}
                </p>
              )}
              <p className="mt-7 border-t border-world-outline pt-5 text-sm leading-6 text-world-muted">
                Pilih channel untuk bertemu pemain lain. Quest, XP, dan koleksimu tetap tersimpan di
                akunmu.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <Link to="/" className="min-h-11 py-3 text-sm underline">
                  Menu utama
                </Link>
                <ActionButton
                  busy={loggingOut}
                  busyLabel="Keluar…"
                  className="adventure-secondary"
                  onClick={() => void signOut()}
                >
                  Keluar akun
                </ActionButton>
              </div>
              {exitError && <p role="alert">{exitError}</p>}
              <details className="mt-5 text-xs text-world-muted">
                <summary className="min-h-11 cursor-pointer py-3">Kredit dunia</summary>
                {ASSET_CREDITS.map((c) => (
                  <p key={c.pack} className="py-2">
                    <a href={c.source} target="_blank" rel="noreferrer" className="underline">
                      {c.pack}
                    </a>{" "}
                    · {c.creator} · {c.license}
                  </p>
                ))}
              </details>
            </section>
            <div className="adventure-panel">
              {profile ? (
                <ChannelSelector />
              ) : (
                <>
                  <AdventureSkeleton label="Menyiapkan profil…" />
                  <ActionButton onClick={() => void useProfile.getState().load()}>
                    Muat ulang profil
                  </ActionButton>
                </>
              )}
            </div>
          </div>
        </AdventureShell>
      )}
      {lease && !playing && (
        <div
          className="absolute inset-0 z-50 grid place-items-center overflow-y-auto bg-[#1a0f10f2] p-5 text-[#fff8ef]"
          data-ui-panel
        >
          <section
            className="adventure-panel w-full max-w-md text-[#fff8ef]"
            role="status"
            aria-live="polite"
          >
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
                  label: connected
                    ? "Multiplayer tersambung"
                    : "Multiplayer (lanjut di latar)",
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
    </main>
  );
}
