/** Retire only the old UpUp worker on local dev; never clear another app's workers/caches. */
export async function clearLegacyWorker() {
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(location.hostname) ||
    !("serviceWorker" in navigator)
  )
    return;
  const legacy = (url: string) => /\/(?:\d+)?upup\.sw(?:\.min)?\.js$/.test(new URL(url).pathname);
  try {
    const controlled = navigator.serviceWorker.controller?.scriptURL;
    const workers = await navigator.serviceWorker.getRegistrations();
    const targets = workers.filter((r) =>
      [r.active, r.waiting, r.installing].some((w) => w && legacy(w.scriptURL)),
    );
    await Promise.all(targets.map((r) => r.unregister()));
    if (controlled && legacy(controlled) && !sessionStorage.getItem("world-retired-upup")) {
      sessionStorage.setItem("world-retired-upup", "1");
      location.reload();
    }
  } catch {
    /* Browser privacy settings may disallow enumerating service workers. */
  }
}
