import { useEffect, useState, type FormEvent } from "react";
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
    <section aria-labelledby="profiles-heading" className="card">
      <h2 id="profiles-heading">Profils</h2>

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
                <span data-part="identity">{profile.username}</span>
                <span data-part="platform">chess.com</span>
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
