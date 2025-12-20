import { getUrlsFromSitemap, fetchPageAsText } from "@/lib/dsCrawl";
import { openai } from "@/lib/openai";

export const maxDuration = 300;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    const sitemapUrl = process.env.DS_SITEMAP_URL;
    const maxPages = Number(process.env.DS_MAX_PAGES || "50");

    if (!sitemapUrl) {
      return new Response(
        JSON.stringify({ error: "DS_SITEMAP_URL is missing in env vars" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("Starting crawl:", { sitemapUrl, maxPages });

    const urls = await getUrlsFromSitemap(sitemapUrl, maxPages);
    console.log("URLs found:", urls.length);
console.log("First 10 URLs:", urls.slice(0, 10));


    // 1) Crawl pages (sequential, polite)
    const docs: { url: string; text: string }[] = [];

    for (const url of urls) {
      try {
        const text = await fetchPageAsText(url);
        docs.push({ url, text });
        await new Promise((r) => setTimeout(r, 400));
      } catch (err: any) {
        console.log("Crawl error:", url, err?.message || err);
      }
    }

    console.log("Crawl finished. Pages:", docs.length);
if (docs.length === 0) {
  return new Response(
    JSON.stringify({
      status: "no_data",
      urls_found: urls.length,
      pages_crawled: docs.length,
      hint:
        urls.length === 0
          ? "Sitemap parsed 0 URLs. Check DS_SITEMAP_URL and sitemap parsing."
          : "All page fetches failed. Check Vercel logs for Crawl error lines (403/404/429).",
      sample_urls: urls.slice(0, 10),
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}


    // 2) Create a NEW vector store (green)
    const vectorStore = await openai.vectorStores.create({
      name: `ds-site-${new Date().toISOString()}`,
      // Optional but recommended: auto-expire to avoid cost leaks if you don't delete old stores
      expires_after: { anchor: "last_active_at", days: 7 },
    });

    console.log("Created vector store:", vectorStore.id);

    // 3) Upload files to OpenAI
    // NOTE: Use small batches; uploading hundreds in one shot can be slow.
    const fileIds: string[] = [];

    for (let i = 0; i < docs.length; i++) {
      const { url, text } = docs[i];

      const file = await openai.files.create({
        purpose: "assistants",
        file: new File(
          [text],
          // Safe filename
          `ds_${i}_${encodeURIComponent(url).slice(0, 80)}.txt`,
          { type: "text/plain" }
        ),
      });

      fileIds.push(file.id);

      // light throttle
      if (i % 10 === 0) await new Promise((r) => setTimeout(r, 250));
    }

    console.log("Uploaded files:", fileIds.length);

    // 4) Attach files to the vector store and wait until indexing is done
    // Create one big batch:
    const batch = await openai.vectorStores.fileBatches.createAndPoll(
      vectorStore.id,
      { file_ids: fileIds }
    );

    console.log("Vector store batch status:", batch.status);

    if (batch.status !== "completed") {
      return new Response(
        JSON.stringify({
          error: "Vector store ingestion did not complete",
          status: batch.status,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // ✅ At this point, your NEW store is ready.
    return new Response(
      JSON.stringify({
        status: "ok",
        crawled: docs.length,
        vector_store_id: vectorStore.id,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.log("refresh-ds fatal error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
