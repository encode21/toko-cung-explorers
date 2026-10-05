import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Masuk Akun Pemain — Toko Cung World" },
      {
        name: "description",
        content:
          "Buat akun pemain Toko Cung World atau masuk dengan email dan kata sandi, lalu main bersama pemain lain di toko 3D.",
      },
      { property: "og:title", content: "Masuk Akun Pemain — Toko Cung World" },
      { property: "og:description", content: "Satu akun untuk masuk ke dunia 3D Toko Cung bersama pemain lain." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) void navigate({ to: "/world", replace: true });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/world",
            data: { display_name: name.trim().slice(0, 18) || email.split("@")[0] },
          },
        });
        if (err) throw err;
        if (!data.session) {
          setInfo("Akun dibuat. Cek email kamu dan klik tautan konfirmasi, lalu masuk di sini.");
          setMode("signin");
          return;
        }
        await navigate({ to: "/world", replace: true });
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        await navigate({ to: "/world", replace: true });
      }
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Gagal masuk.";
      setError(
        /invalid login/i.test(raw)
          ? "Email atau kata sandi salah."
          : /email not confirmed/i.test(raw)
            ? "Email belum dikonfirmasi. Cek kotak masuk kamu."
            : raw,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-world-outline bg-world-panel p-7 text-world-panel-foreground">
        <h1 className="font-display text-4xl leading-none tracking-wide">
          {mode === "signin" ? "MASUK KE TOKO CUNG WORLD" : "BUAT AKUN PEMAIN"}
        </h1>
        <p className="mt-3 text-sm text-world-muted">
          Satu akun pemain untuk masuk ke dunia 3D bersama pemain lain, dengan nama yang tetap.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          {mode === "signup" && (
            <div>
              <label className="text-world-muted text-xs uppercase tracking-[0.2em]" htmlFor="name">
                Nama pemain
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={18}
                placeholder="mis. Rangga"
                className="mt-1 w-full rounded-lg border border-world-outline bg-[oklch(0.2_0.02_50/0.6)] px-3 py-2 text-sm outline-none placeholder:text-world-muted"
              />
            </div>
          )}
          <div>
            <label className="text-world-muted text-xs uppercase tracking-[0.2em]" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-world-outline bg-[oklch(0.2_0.02_50/0.6)] px-3 py-2 text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-world-muted text-xs uppercase tracking-[0.2em]" htmlFor="password">
              Kata sandi
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-world-outline bg-[oklch(0.2_0.02_50/0.6)] px-3 py-2 text-sm outline-none"
            />
          </div>

          {error && <p className="text-sm text-world-accent">{error}</p>}
          {info && <p className="text-sm text-world-muted">{info}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-world-brand px-5 py-3 font-semibold text-world-brand-foreground transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? "Memproses…" : mode === "signin" ? "Masuk" : "Daftar & mulai"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
          className="mt-4 w-full text-center text-sm text-world-muted underline"
        >
          {mode === "signin" ? "Belum punya akun? Daftar dulu" : "Sudah punya akun? Masuk"}
        </button>

        <Link to="/" className="mt-3 block text-center text-world-muted text-xs underline">
          Kembali ke halaman depan
        </Link>
      </div>
    </main>
  );
}
