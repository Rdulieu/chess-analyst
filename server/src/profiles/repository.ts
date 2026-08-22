import { and, eq, sql } from "drizzle-orm";
import type { Platform } from "../platform";
import type { Db } from "../db";
import { games, profiles, type Profile } from "../db/schema";

/**
 * A `Profile` with the size of the history it owns: how many Games were
 * imported under it and how many of those have been through an `Analysis pass`.
 * The pair is what tells, at a glance, which Profile is worth opening.
 */
export interface ProfileWithCounts extends Profile {
  games: number;
  analyzed: number;
}

/** Every `Profile`, oldest first — the order they were created in — with its counters. */
export function listProfiles(db: Db): ProfileWithCounts[] {
  return countedProfiles(db);
}

/**
 * One `Profile` with the same counters the list shows, or `undefined` when no
 * Profile has that id — what its own page reads. Deliberately the *same* query
 * as the list, filtered: a Profile's page and its row in the list can then not
 * disagree about how many Games it holds.
 */
export function getProfile(db: Db, id: number): ProfileWithCounts | undefined {
  if (!Number.isInteger(id)) return undefined;
  return countedProfiles(db, id)[0];
}

/** The counted-Profile query, over all of them or over the one `id` names. */
function countedProfiles(db: Db, id?: number): ProfileWithCounts[] {
  return (
    db
      .select({
        id: profiles.id,
        platform: profiles.platform,
        username: profiles.username,
        createdAt: profiles.createdAt,
        games: sql<number>`count(${games.id})`,
        analyzed: sql<number>`sum(case when ${games.analyzed} then 1 else 0 end)`.mapWith(Number),
      })
      .from(profiles)
      // A Profile with no Game yet is still a Profile, and reads zero rather than
      // disappearing from the list.
      .leftJoin(games, eq(games.profileId, profiles.id))
      .where(id === undefined ? undefined : eq(profiles.id, id))
      .groupBy(profiles.id)
      .orderBy(profiles.id)
      .all()
  );
}

/**
 * The `Profile` for this account, **whatever casing** the username is spelled
 * in. The platform's own canonical spelling is what gets stored, so the two
 * normally agree; matching case-insensitively means that even a platform that
 * changed its mind about an account's casing cannot yield a second Profile.
 */
export function findProfile(db: Db, platform: Platform, username: string): Profile | undefined {
  return db
    .select()
    .from(profiles)
    .where(
      and(eq(profiles.platform, platform), sql`lower(${profiles.username}) = lower(${username})`),
    )
    .get();
}

/**
 * The `Profile` this id names, or `undefined` when no Profile has it. What an
 * endpoint scoped to a Profile calls before answering: a request naming an
 * unknown Profile must be **refused**, never silently answered over every row
 * (PRD, *API*).
 */
export function findProfileById(db: Db, id: number): Profile | undefined {
  if (!Number.isInteger(id)) return undefined;
  return db.select().from(profiles).where(eq(profiles.id, id)).get();
}

/**
 * Removes a `Profile`, and reports whether there was one to remove. Nothing
 * hangs off a Profile yet — the Games, habits and passes it will own arrive in
 * later slices, and the deletion cascades to them there.
 */
export function deleteProfile(db: Db, id: number): boolean {
  return db.delete(profiles).where(eq(profiles.id, id)).returning().all().length > 0;
}

/**
 * The `Profile` for an account **the platform has already vouched for**,
 * creating it if this is the first time we see it. The one function every entry
 * point goes through once it holds a canonical username — profile creation and
 * Import alike — so "the same account is one Profile" is a property of the
 * store rather than a rule each caller remembers. `created` is what lets a
 * caller tell the two outcomes apart.
 */
export function resolveProfile(
  db: Db,
  platform: Platform,
  canonicalUsername: string,
): { profile: Profile; created: boolean } {
  const existing = findProfile(db, platform, canonicalUsername);
  if (existing) return { profile: existing, created: false };
  return { profile: createProfile(db, platform, canonicalUsername), created: true };
}

/** Stores a new `Profile` and returns it as stored (with its id). */
export function createProfile(db: Db, platform: Platform, username: string): Profile {
  return db
    .insert(profiles)
    .values({ platform, username, createdAt: new Date().toISOString() })
    .returning()
    .get();
}
