import * as cheerio from "cheerio";

function cleanText(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
}

export async function getUrlsFromSitemap(sitemapUrl: string, limit: number) {
  const res = await fetch(sitemapUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch sitemap: ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const urls = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    // Normalize relative URLs
    const fullUrl = href.startsWith("http")
      ? href
      : `https://www.davis-stirling.com${href}`;

    if (fullUrl.startsWith("https://www.davis-stirling.com/")) {
      urls.add(fullUrl.split("#")[0]);
    }
  });

  return Array.from(urls).slice(0, limit);
}


export async function fetchPageAsText(url: string) {
 const res = await fetch(url, {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  },
});

  if (!res.ok) throw new Error(`Failed to fetch page ${url}: ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);

  // Remove junk that inflates text
  $("script, style, nav, footer, header, noscript").remove();

  const title = cleanText($("title").first().text() || "");
  const bodyText = cleanText($("body").text() || "");

  // Final document we’ll upload later
  const doc = [
    `TITLE: ${title}`,
    `URL: ${url}`,
    ``,
    bodyText,
  ].join("\n");

  return doc;
}
