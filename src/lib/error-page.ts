export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <title>Halaman gagal dimuat — Toko Cung World</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#c41e3a" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <style>
      body { font: 15px/1.5 "Plus Jakarta Sans", system-ui, -apple-system, sans-serif; background: #0f1419; color: #f5f0e8; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #a8a29a; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.5rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #c41e3a; color: #fff; }
      .secondary { background: transparent; color: #f5f0e8; border-color: #3f3a36; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Halaman gagal dimuat</h1>
      <p>Ada gangguan di sisi kami. Coba muat ulang atau kembali ke beranda Toko Cung World.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Coba lagi</button>
        <a class="secondary" href="/">Ke beranda</a>
      </div>
    </div>
  </body>
</html>`;
}
