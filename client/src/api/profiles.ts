import type { Profile } from "../types";

/** The `Profile`s the app knows, oldest first. */
export async function fetchProfiles(): Promise<Profile[]> {
  const res = await fetch("/api/profiles");
  if (!res.ok) throw new Error(`Failed to load profiles (${res.status})`);
  return (await res.json()) as Profile[];
}

/**
 * Creates a `Profile` for this chess.com account — or, when the account already
 * has one, answers that Profile rather than a second one. The server validates
 * the account against chess.com, so a refusal carries the reason **in the
 * words the Player is shown**: the message is the feature, not the status code.
 */
export async function createProfile(username: string): Promise<Profile> {
  const res = await fetch("/api/profiles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  const body = (await res.json()) as Profile & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `Failed to create profile (${res.status})`);
  return body;
}

/** Deletes a `Profile`. */
export async function deleteProfile(id: number): Promise<void> {
  const res = await fetch(`/api/profiles/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete profile ${id} (${res.status})`);
}
