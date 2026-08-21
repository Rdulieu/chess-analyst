import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { createProfile, deleteProfile, fetchProfiles } from "../api";
import type { Profile } from "../types";
import { clearCurrentProfileId, loadCurrentProfileId, saveCurrentProfileId } from "../features/profiles/currentProfile";

/**
 * Profils (`/profiles`): where the `Profile`s live — the list, the creation of a
 * new one, the choice of the **current** one, and deletion. A Profile is one
 * account on one platform (CONTEXT.md, ADR-0014), and creating one goes through
 * chess.com, so what lands in the list is an account that exists, spelled the
 * way chess.com spells it.
 */
export function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [currentId, setCurrentId] = useState<number | null>(loadCurrentProfileId);

  const [doomed, setDoomed] = useState<Profile | null>(null);

  // The current Profile itself, not just its id: the Import button names it, and
  // a selection pointing at a Profile the list no longer holds is no selection.
  const current = profiles?.find((p) => p.id === currentId) ?? null;

  function select(id: number) {
    saveCurrentProfileId(id);
    setCurrentId(id);
  }

  async function confirmDeletion(profile: Profile) {
    setError(null);
    setDoomed(null);
    try {
      await deleteProfile(profile.id);
      // Deleting the current Profile leaves NOTHING selected: the app must never
      // point at something that no longer exists.
      if (profile.id === currentId) {
        clearCurrentProfileId();
        setCurrentId(null);
      }
      setProfiles(await fetchProfiles());
    } catch (err) {
      setError(err instanceof Error ? err.message : "La suppression a échoué.");
    }
  }

  useEffect(() => {
    fetchProfiles()
      .then(setProfiles)
      .catch(() => setProfiles([]));
  }, []);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      // Creating an account that already has a Profile answers THAT Profile, so
      // the list is re-read rather than appended to (no second entry can appear)
      // and the Player ends up ON the Profile they named, whichever it turned
      // out to be.
      const profile = await createProfile(username);
      setProfiles(await fetchProfiles());
      select(profile.id);
      setUsername("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "La création du profil a échoué.");
    }
  }

  return (
    // The WIDE column, like every other screen holding a dense list: the row
    // carries an account, a platform, two counters, a state and an action, and
    // the five constant tracks plus their gaps do not fit the reading column as
    // soon as there is more than one Profile — the state track then reserves
    // room for "Profil actuel" AND "Sélectionner" at once. Measured overflowing
    // by 24px with two Profiles (2026-08-21); with one, it fitted, which is why
    // it shipped. No content is truncated to make it fit: a username is data.
    <section aria-labelledby="profiles-heading" className="card" data-width="wide">
      <h2 id="profiles-heading">Profils</h2>

      {/* The Import's way in. It lived only behind the Profile's name, which
          does not say where it leads, so the feature was there and unreachable.
          ONE button, not one per row: the Import acts on the **current**
          Profile, and naming it is the whole business of this screen. The
          `#import` fragment asks the Profile's page to open on its form rather
          than merely to render it somewhere below. */}
      {current === null ? null : (
        <p data-part="actions">
          <Link
            to={`/profiles/${current.id}#import`}
            data-action="primary"
            // The accessible name CONTAINS the visible label, then names the
            // Profile: a voice-control Player must be able to say what they
            // read (WCAG 2.5.3), and the action must still be unambiguous
            // about whose parties it fetches.
            aria-label={`Importer mes parties — ${current.username} (chess.com)`}
          >
            Importer mes parties
          </Link>
        </p>
      )}

      {profiles === null ? null : profiles.length === 0 ? (
        <p>Aucun profil — créez-en un à partir d’un compte chess.com pour commencer.</p>
      ) : (
        <ul aria-label="profils">
          {profiles.map((profile) => {
            const isCurrent = profile.id === currentId;
            return (
              // `data-current` for the sheet, and the words "Profil actuel" in
              // the row itself: the current Profile is never told by colour
              // alone (US-13).
              <li key={profile.id} data-current={isCurrent ? "true" : undefined}>
                {/* The identity leads to the Profile's own page, where its
                    Import and its counters live. */}
                <span data-part="identity">
                  <Link to={`/profiles/${profile.id}`}>{profile.username}</Link>
                </span>
                <span data-part="platform">chess.com</span>
                {/* The size of the history, in words rather than bare figures:
                    which Profile is worth opening is the question this row
                    answers. */}
                <span data-part="counts">
                  {profile.games} {profile.games === 1 ? "partie" : "parties"} · {profile.analyzed}{" "}
                  {profile.analyzed === 1 ? "analysée" : "analysées"}
                </span>
                <span data-part="state">
                  {isCurrent ? (
                    <span aria-label="profil actuel">Profil actuel</span>
                  ) : (
                    <button type="button" onClick={() => select(profile.id)}>
                      Sélectionner
                    </button>
                  )}
                </span>
                <span data-part="actions">
                  <button type="button" onClick={() => setDoomed(profile)}>
                    Supprimer
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {doomed === null ? null : (
        // The confirmation NAMES the Profile: deleting the wrong one by reflex
        // is the risk this step exists against.
        <div role="alertdialog" aria-label="confirmer la suppression" className="card">
          <p>
            Supprimer le profil <strong>{doomed.username}</strong> (chess.com) ? Cette action est
            définitive.
          </p>
          <p data-part="actions">
            <button type="button" onClick={() => void confirmDeletion(doomed)}>
              Supprimer
            </button>
            <button type="button" data-action="primary" onClick={() => setDoomed(null)}>
              Annuler
            </button>
          </p>
        </div>
      )}

      <form aria-label="nouveau profil" onSubmit={onCreate}>
        <div>
          <label htmlFor="profile-username">Compte chess.com</label>
          <input
            id="profile-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <button type="submit" data-action="primary">
          Ajouter
        </button>
        {error === null ? null : <p role="alert">{error}</p>}
      </form>
    </section>
  );
}
