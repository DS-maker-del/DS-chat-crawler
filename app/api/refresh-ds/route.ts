<<<<<<< HEAD
import { getUrlsFromSitemap, fetchPageAsText } from "@/lib/dsCrawl";

export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const sitemapUrl = process.env.DS_SITEMAP_URL!;
  const maxPages = Number(process.env.DS_MAX_PAGES || "50");

  console.log("Starting crawl:", { sitemapUrl, maxPages });

  const urls = await getUrlsFromSitemap(sitemapUrl, maxPages);
  console.log("URLs found:", urls.length);

  // Crawl a few pages (sequential for safety)
  const results: { url: string; length: number }[] = [];

  for (const url of urls) {
    try {
      const text = await fetchPageAsText(url);
      results.push({ url, length: text.length });

      // IMPORTANT: throttle so we don’t hammer the site
      await new Promise((r) => setTimeout(r, 400));
    } catch (err: any) {
      console.log("Crawl error:", url, err?.message || err);
    }
  }

  console.log("Crawl finished.");

  return new Response(
    JSON.stringify({
      status: "ok",
      crawled: results.length,
      sample: results.slice(0, 5),
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
=======
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
>>>>>>> bbe93c93ff030529de7ba7a109f919705f5cc1c8
