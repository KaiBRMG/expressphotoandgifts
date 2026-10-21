import "server-only";

import { timingSafeEqual } from "node:crypto";

/** Two secrets compared without giving away, by how long it takes, how much of one matched. */
export const safeEqual = (given: string | null | undefined, expected: string) =>
  typeof given === "string" && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));

/**
 * Runs a job for the host's cron (`vercel.json`), which sends
 * `Authorization: Bearer <CRON_SECRET>`. Without CRON_SECRET set, nothing can
 * run it.
 */
export async function cronJob(request: Request, name: string, job: () => Promise<unknown>): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("CRON_SECRET is not set", { status: 503 });
  if (!safeEqual(request.headers.get("authorization"), `Bearer ${secret}`)) return new Response("Unauthorized", { status: 401 });
  try {
    const result = await job();
    console.log(name, result);
    return Response.json(result);
  } catch (e) {
    console.error(`${name} failed`, e);
    return new Response(`${name} failed`, { status: 500 });
  }
}
