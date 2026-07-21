/** The Player's remembered chess.com username (null when never set). */
export interface Settings {
  username: string | null;
}

/** Reads the stored Player settings from the local API. */
export async function getSettings(): Promise<Settings> {
  const res = await fetch("/api/settings");
  if (!res.ok) throw new Error(`Failed to load settings (${res.status})`);
  return (await res.json()) as Settings;
}

/** Persists the Player's chess.com username so it survives across sessions. */
export async function saveSettings(username: string): Promise<void> {
  const res = await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) throw new Error(`Failed to save settings (${res.status})`);
}
