import { request as httpRequest, type IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";

/**
 * Every Lichess request goes through here, for one reason: **the address family
 * is pinned to IPv4**.
 *
 * This is a **determinism choice, not a correctness requirement** — it was
 * documented as one, and that was wrong. What is actually known: the games-export
 * endpoint answered an instant, sustained `429` over IPv6 while answering `200`
 * over IPv4, and on 2026-08-22 **the exact opposite reproduced** (IPv4 → `429`,
 * IPv6 → `200`, two accounts seconds apart) after a 71-request reference import
 * had run over the pinned IPv4. Neither address family is refused; the
 * explanation covering both observations is a **per-IP throttle on the export
 * endpoint**, keyed to a recent burst — so the family that just did the bursting
 * is the one that gets refused, whichever it is.
 *
 * The pin is kept for what it actually buys: one variable fewer when diagnosing
 * a `429`, since both attempts then come from the same address. US-17 largely
 * dissolves the question anyway — one request for a whole range is not a burst.
 *
 * `node:http(s)` is used rather than `fetch` because `family: 4` is a documented
 * option there, with no dependency to add and no reliance on which undici a
 * given Node ships. The response is handed back as a stream, which is also what
 * the ndjson games export wants.
 */

export interface LichessResponse {
  status: number;
  body: IncomingMessage;
}

/** A GET to Lichess, over IPv4, with the response left as a stream. */
export function lichessGet(url: string, headers: Record<string, string>): Promise<LichessResponse> {
  const target = new URL(url);
  const send = target.protocol === "https:" ? httpsRequest : httpRequest;
  return new Promise((resolve, reject) => {
    const req = send(
      target,
      // The pin itself. Anything that bypasses this helper loses it silently,
      // which is why nothing in the adapter calls `fetch` directly.
      { method: "GET", family: 4, headers },
      (res) => resolve({ status: res.statusCode ?? 0, body: res }),
    );
    req.on("error", reject);
    req.end();
  });
}

/** The whole body as text — for the small JSON answers (an account lookup). */
export async function readText(body: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of body) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

/** Drains a body we are not going to read, so the socket is not left hanging. */
export function discard(body: IncomingMessage): void {
  body.resume();
}

/**
 * The body as ndjson: one JSON document **per line**. A multi-object body is not
 * parseable as a single JSON document, and the export is a stream, so the lines
 * are consumed as they arrive rather than buffered and split afterwards. Blank
 * lines (including the trailing one) are ordinary in a stream and are skipped.
 */
export async function* readNdjson(body: IncomingMessage): AsyncGenerator<unknown> {
  let pending = "";
  for await (const chunk of body) {
    pending += (chunk as Buffer).toString("utf8");
    let cut = pending.indexOf("\n");
    while (cut >= 0) {
      const line = pending.slice(0, cut).trim();
      pending = pending.slice(cut + 1);
      if (line !== "") yield JSON.parse(line);
      cut = pending.indexOf("\n");
    }
  }
  // A last line with no newline after it is still a document.
  const tail = pending.trim();
  if (tail !== "") yield JSON.parse(tail);
}
