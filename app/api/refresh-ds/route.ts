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

  const results: { url: string; length: number }[] = [];

  for (const url of urls) {
    try {
      const text = await fetchPageAsText(url);
      results.push({ url, length: text.length });

      // Throttle (polite crawling)
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
