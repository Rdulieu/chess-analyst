import { request as httpRequest, type IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";

/**
 * Every Lichess request goes through here, for one reason: **the address family
 * is pinned to IPv4**.
 *
 * This is a correctness requirement, not a tuning knob. Measured against the
 * live API: the games-export endpoint answers an instant, permanent `429` over
 * IPv6 from a real network — insensitive to waiting, independent of the account,
 * specific to that endpoint — while answering `200` over IPv4. Node's `fetch`
 * does Happy Eyeballs and may pick IPv6, so without the pin a perfectly correct
 * import fails with a message that invites exactly the wrong fixes (wait longer,
 * retry, add a token).
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
