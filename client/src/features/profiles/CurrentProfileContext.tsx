import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { fetchProfile, ProfileNotFound } from "../../api";
import type { Profile } from "../../types";
import {
  clearCurrentProfileId,
  loadCurrentProfileId,
  subscribeCurrentProfileId,
} from "./currentProfile";

/**
 * What the app knows about the **current `Profile`** right now. The four states
 * are kept apart on purpose — collapsing them is how a screen ends up saying
 * "aucun profil" while a Profile is perfectly well selected and the server is
 * simply down.
 */
export type CurrentProfile =
  | { state: "none" }
  | { state: "loading" }
  | { state: "failed"; error: string; retry: () => void }
  | { state: "ready"; profile: Profile };

const Context = createContext<CurrentProfile>({ state: "none" });

/**
 * Resolves the current `Profile` once, at the shell, and shares it: the banner
 * in the chrome and the scoped page below it are then two views of **one**
 * answer, and cannot disagree about whose figures are on screen.
 *
 * Only the id is persisted (see `currentProfile`); the Profile's own fields are
 * always read from the API, so a stale local copy can never contradict the list.
 */
export function CurrentProfileProvider({ children }: { children: ReactNode }) {
  const id = useSyncExternalStore(subscribeCurrentProfileId, loadCurrentProfileId);
  const [current, setCurrent] = useState<CurrentProfile>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (id === null) {
      setCurrent({ state: "none" });
      return;
    }
    let live = true;
    setCurrent({ state: "loading" });
    fetchProfile(id)
      .then((profile) => live && setCurrent({ state: "ready", profile }))
      .catch((cause: Error) => {
        if (!live) return;
        // The Profile is GONE (deleted elsewhere, or a database that moved on).
        // The app must never point at something that no longer exists, and a
        // retry here could only fail again — so the selection is dropped and the
        // Player is sent to `/profiles` like anyone with nothing selected. An
        // outage is deliberately NOT this case: it says nothing about the
        // Profile, and losing the choice over it would be the worse answer.
        if (cause instanceof ProfileNotFound) {
          clearCurrentProfileId();
          setCurrent({ state: "none" });
          return;
        }
        setCurrent({ state: "failed", error: cause.message, retry });
      });
    return () => {
      live = false;
    };
  }, [id, attempt, retry]);

  return <Context.Provider value={current}>{children}</Context.Provider>;
}

/** The current `Profile`, in whichever of its four states it is. */
export function useCurrentProfile(): CurrentProfile {
  return useContext(Context);
}
