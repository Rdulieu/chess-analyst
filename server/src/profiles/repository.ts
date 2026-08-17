import { and, eq, sql } from "drizzle-orm";
import type { Db } from "../db";
import { profiles, type Profile } from "../db/schema";

/** Every `Profile`, oldest first — the order they were created in. */
export function listProfiles(db: Db): Profile[] {
  return db.select().from(profiles).orderBy(profiles.id).all();
}

/**
 * The `Profile` for this account, **whatever casing** the username is spelled
 * in. The platform's own canonical spelling is what gets stored, so the two
 * normally agree; matching case-insensitively means that even a platform that
 * changed its mind about an account's casing cannot yield a second Profile.
 */
export function findProfile(
  db: Db,
  platform: "chesscom",
  username: string,
): Profile | undefined {
  return db
    .select()
    .from(profiles)
    .where(
      and(
        eq(profiles.platform, platform),
        sql`lower(${profiles.username}) = lower(${username})`,
      ),
    )
    .get();
}

/**
 * Removes a `Profile`, and reports whether there was one to remove. Nothing
 * hangs off a Profile yet — the Games, habits and passes it will own arrive in
 * later slices, and the deletion cascades to them there.
 */
export function deleteProfile(db: Db, id: number): boolean {
  return db.delete(profiles).where(eq(profiles.id, id)).returning().all().length > 0;
}

/** Stores a new `Profile` and returns it as stored (with its id). */
export function createProfile(
  db: Db,
  platform: "chesscom",
  username: string,
): Profile {
  return db
    .insert(profiles)
    .values({ platform, username, createdAt: new Date().toISOString() })
    .returning()
    .get();
}
