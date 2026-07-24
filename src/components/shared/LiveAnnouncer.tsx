import { useEffect, useState } from "react";

/**
 * Global accessible live-region announcer.
 * Mount <LiveAnnouncer /> once at the app root. Call announce("…") from anywhere
 * to make screen readers speak the message (polite, atomic).
 */
type Listener = (msg: string) => void;
const listeners = new Set<Listener>();

export function announce(message: string) {
  if (!message) return;
  listeners.forEach((l) => l(message));
}

export default function LiveAnnouncer() {
  const [msg, setMsg] = useState("");
  useEffect(() => {
    const l: Listener = (m) => {
      // Toggle to force re-announce even when the same message repeats
      setMsg("");
      requestAnimationFrame(() => setMsg(m));
    };
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      data-testid="live-announcer"
    >
      {msg}
    </div>
  );
}
