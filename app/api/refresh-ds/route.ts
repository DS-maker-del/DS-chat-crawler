// app/api/refresh-ds/route.ts

export const runtime = "nodejs"; // we’ll need Node for crawling later
export const maxDuration = 300;  // allows longer processing (plan limits apply)

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET) {
    return new Response("CRON_SECRET is not set", { status: 500 });
  }

  if (auth !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  // For now: just prove the endpoint works.
  return new Response(
    JSON.stringify({ ok: true, message: "refresh endpoint reached" }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}
