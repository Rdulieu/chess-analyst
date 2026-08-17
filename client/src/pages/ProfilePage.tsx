import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchProfile } from "../api";
import { ImportForm } from "../features/import/ImportForm";
import type { Profile } from "../types";

/**
 * One `Profile`'s own page (`/profiles/:id`): its identity, the size of the
 * history it owns, and **its Import**. Importing is an operation *on* a Profile
 * (ADR-0014), so the form lives here rather than on "Mes parties" — the account
 * being fetched is the one named at the top of the screen, and there is nothing
 * to type that could point it elsewhere.
 *
 * The only route carrying an id, deliberately: here the Player acts *on* a named
 * Profile; the analysis pages read *the* current one's data (PRD, *Client*).
 */
export function ProfilePage() {
  const { id } = useParams();
  const profileId = Number(id);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setProfile(await fetchProfile(profileId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profil introuvable.");
    }
  }, [profileId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (error !== null) {
    return (
      <section aria-labelledby="profile-heading" className="card">
        <h2 id="profile-heading">Profil</h2>
        <p role="alert">{error}</p>
      </section>
    );
  }

  if (profile === null) return null;

  return (
    // The default reading column, NOT the wide variant: a form and a few
    // counters have no claim on the width US-13 reserves for the dense screens.
    <section aria-labelledby="profile-heading" className="card">
      <h2 id="profile-heading">{profile.username}</h2>
      <p data-part="identity">chess.com</p>
      {/* The counters in words rather than bare figures — the same pair the
          list shows, read from the same query, so the two cannot disagree. */}
      <p data-part="counts">
        {profile.games} {profile.games === 1 ? "partie importée" : "parties importées"} ·{" "}
        {profile.analyzed} {profile.analyzed === 1 ? "analysée" : "analysées"}
      </p>

      <h3>Importer des parties</h3>
      <ImportForm profileId={profile.id} onImported={refresh} />
    </section>
  );
}
