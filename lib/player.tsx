"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { ROSTER } from "./roster";

const STORAGE_KEY = "soccer-hotels-my-player";
const PARENT_KEY = "soccer-hotels-parent-name";

interface PlayerState {
  player: string | null; // null = still loading from storage, "" = not picked
  parentName: string;
  select: (name: string, parent: string) => void;
  setParentName: (name: string) => void;
  reset: () => void;
}

const PlayerContext = createContext<PlayerState>({
  player: null,
  parentName: "",
  select: () => {},
  setParentName: () => {},
  reset: () => {},
});

export function usePlayer(): string {
  return useContext(PlayerContext).player ?? "";
}

export function useParentName(): string {
  return useContext(PlayerContext).parentName;
}

async function registerParent(player: string, parent: string) {
  try {
    await fetch("/api/parents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_name: player, parent_name: parent }),
    });
  } catch {
    // Non-fatal: the name can be re-registered from the attendance list.
  }
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [player, setPlayer] = useState<string | null>(null);
  const [parentName, setParentNameState] = useState("");

  useEffect(() => {
    setPlayer(localStorage.getItem(STORAGE_KEY) ?? "");
    setParentNameState(localStorage.getItem(PARENT_KEY) ?? "");
  }, []);

  const select = (name: string, parent: string) => {
    localStorage.setItem(STORAGE_KEY, name);
    localStorage.setItem(PARENT_KEY, parent);
    setPlayer(name);
    setParentNameState(parent);
    registerParent(name, parent);
  };

  const setParentName = (name: string) => {
    localStorage.setItem(PARENT_KEY, name);
    setParentNameState(name);
    if (player) registerParent(player, name);
  };

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PARENT_KEY);
    setPlayer("");
    setParentNameState("");
  };

  return (
    <PlayerContext.Provider
      value={{ player, parentName, select, setParentName, reset }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

// Blocks page content until a player has been picked and confirmed (with the
// parent's first name). The choice is stored on the device permanently — both
// parents pick the same player on their own phones to share the plans.
export function PlayerGate({ children }: { children: React.ReactNode }) {
  const { player, parentName, select, setParentName } =
    useContext(PlayerContext);
  const [pending, setPending] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");

  if (player === null) return <div className="loading">Loading…</div>;

  // Devices that claimed a player before parent names existed get a one-time
  // "who are you?" prompt.
  if (player && !parentName) {
    return (
      <div className="picker card">
        <h2 className="picker-title">One quick thing — who are you?</h2>
        <p className="picker-sub">
          Your first name shows on the who&apos;s-going list so the team knows
          which parent is at each game.
        </p>
        <div className="link-form" style={{ maxWidth: 340 }}>
          <input
            placeholder="Your first name"
            value={nameInput}
            autoFocus
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && nameInput.trim() && setParentName(nameInput.trim())
            }
          />
          <div className="link-form-actions">
            <button
              className="btn btn-primary"
              disabled={!nameInput.trim()}
              onClick={() => setParentName(nameInput.trim())}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (player) return <>{children}</>;

  return (
    <div className="picker card">
      {pending ? (
        <>
          <h2 className="picker-title">Confirm your player</h2>
          <p className="picker-sub">
            Set <strong>{pending}</strong> as your player on this device?
            Hotels and plans you add will be for {pending.split(" ")[0]}, and
            this can&apos;t be changed later.
          </p>
          <div className="link-form" style={{ maxWidth: 340 }}>
            <input
              placeholder="Your first name (e.g. Vishal)"
              value={nameInput}
              autoFocus
              onChange={(e) => setNameInput(e.target.value)}
            />
            <div className="picker-actions">
              <button
                className="btn btn-primary"
                disabled={!nameInput.trim()}
                onClick={() => select(pending, nameInput.trim())}
              >
                Yes, that&apos;s my player
              </button>
              <button className="btn" onClick={() => setPending(null)}>
                Go back
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <h2 className="picker-title">Welcome! Who&apos;s your player?</h2>
          <p className="picker-sub">
            Pick your child to track team travel. Each parent picks the same
            player on their own phone.
          </p>
          <div className="picker-grid">
            {ROSTER.map((p) => (
              <button
                key={p.name}
                className="picker-player"
                onClick={() => setPending(p.name)}
              >
                <span className="num">#{p.number}</span> {p.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Long-pressing the badge for 2 seconds offers a hidden way to re-pick the
// player if the wrong one was chosen; casual taps do nothing.
export function PlayerBadge() {
  const { player, parentName, reset } = useContext(PlayerContext);
  const timer = useRef<number | null>(null);
  const p = ROSTER.find((r) => r.name === player);
  if (!player) return null;

  const startPress = () => {
    timer.current = window.setTimeout(() => {
      if (
        window.confirm(
          "Switch player on this device? Your family's saved entries stay in place."
        )
      ) {
        reset();
      }
    }, 2000);
  };
  const cancelPress = () => {
    if (timer.current) window.clearTimeout(timer.current);
  };

  return (
    <span
      className="player-chip header-player"
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="num">#{p?.number ?? "–"}</span>
      {player}
      {parentName && <span className="badge-parent">· {parentName}</span>}
    </span>
  );
}
