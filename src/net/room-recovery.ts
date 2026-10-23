/** One retry loop per mounted room; a closed channel is terminal in the realtime SDK. */
export function createRoomRecovery(options: {
  current: () => boolean;
  connected: () => boolean;
  online: () => boolean;
  authorize: () => Promise<boolean>;
  reconnect: () => void | Promise<void>;
}) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  let running = false;
  let attempts = 0;
  const cancel = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const schedule = (minimumDelay = 0) => {
    if (disposed || !options.current() || options.connected() || timer !== undefined) return;
    timer = setTimeout(
      () => {
        timer = undefined;
        void run();
      },
      Math.max(minimumDelay, Math.min(30000, 2000 * 2 ** Math.min(attempts, 4))),
    );
  };
  const run = async () => {
    if (disposed || running || !options.current() || options.connected()) return;
    if (!options.online()) {
      schedule();
      return;
    }
    running = true;
    attempts++;
    let replaced = false;
    try {
      const authorized = await options.authorize();
      // A room handoff/logout or SDK recovery may finish while authorization is pending.
      if (authorized && !disposed && options.current() && !options.connected()) {
        await options.reconnect();
        replaced = true;
      }
    } catch {
      // Authorization/transport errors retry with backoff, never an unhandled rejection.
    } finally {
      running = false;
      // Give the new subscription its normal join timeout before replacing it again.
      schedule(replaced ? 12000 : 0);
    }
  };
  return {
    schedule,
    retry: () => {
      cancel();
      void run();
    },
    connected: () => {
      attempts = 0;
      cancel();
    },
    dispose: () => {
      disposed = true;
      cancel();
    },
  };
}
