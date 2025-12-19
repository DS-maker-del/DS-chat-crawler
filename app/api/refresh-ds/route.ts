export const maxDuration = 300; // allow up to 5 minutes

export async function GET(request: Request) {
  // 1. Check secret so only Vercel cron can run this
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. Log so we can confirm it ran
  console.log("Davis-Stirling refresh cron triggered");

  // 3. Respond OK
  return new Response(
    JSON.stringify({ status: "ok", message: "Cron ran successfully" }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
