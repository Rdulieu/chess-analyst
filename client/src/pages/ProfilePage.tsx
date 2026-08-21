import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { fetchProfile } from "../api";
import { ImportForm } from "../features/import/ImportForm";
import { ProfileAnalysisPass } from "../features/analysis/ProfileAnalysisPass";
import type { Profile } from "../types";

/**
 * One `Profile`'s own page (`/profiles/:id`): its identity, the size of the
 * history it owns, where **its** `Analysis pass` stands, and **its Import**.
 * Everything on this page is about this account and nothing else — the counters
 * and the pass state alike are read for this Profile by id (ADR-0014), so no
 * figure here can be another Player's. Importing is an operation *on* a Profile
 * (ADR-0014), so the form lives here rather than on "Mes parties" — the account
 * being fetched is the one named at the top of the screen, and there is nothing
 * to type that could point it elsewhere.
 *
 * The only route carrying an id, deliberately: here the Player acts *on* a named
 * Profile; the analysis pages read *the* current one's data (PRD, *Client*).
 */
export function ProfilePage() {
  const { id } = useParams();
  const { hash } = useLocation();
  const profileId = Number(id);
  const importRef = useRef<HTMLDivElement>(null);
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

  // Arriving with `#import` is a request for the Import, not merely for the
  // page: `/profiles` offers one button for it, and a button that lands the
  // Player next to the form without giving it the focus has only moved the
  // hunt one screen along. Waits for the Profile, because the form is not
  // mounted until then.
  useEffect(() => {
    if (hash !== "#import" || profile === null) return;
    const section = importRef.current;
    section?.querySelector<HTMLElement>("input, select, button")?.focus();
    // Feature-detected: scrolling is a nicety on top of the focus, and it is
    // absent outside a real browser — letting it throw here would undo the
    // focus that is the point of this effect.
    section?.scrollIntoView?.({ block: "start" });
  }, [hash, profile]);

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
      {/* Where this Player's `Analysis pass` stands — theirs alone (ADR-0014).
          It sits right under the analyzed count because the two answer the same
          question at two grains: how much of the history is done, and how the
          last attempt at it ended. */}
      <ProfileAnalysisPass profileId={profile.id} />

      <div ref={importRef}>
        <h3 id="import">Importer des parties</h3>
        <ImportForm profileId={profile.id} onImported={refresh} />
      </div>
    </section>
  );
}
