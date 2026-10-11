/** Set the official App universal link at deployment; never guess a payment destination. */
const configured = import.meta.env["VITE_TOKO_CUNG_APP_URL"] as string | undefined;
const APP_URL = configured && /^https:\/\//i.test(configured) ? configured : null;
export function AppBridge({ className = "" }: { className?: string }) {
  return APP_URL ? (
    <a className={className} href={APP_URL} target="_blank" rel="noopener noreferrer">
      Buka Toko Cung App ↗
    </a>
  ) : (
    <span className={className}>Belanja di Toko Cung App</span>
  );
}
