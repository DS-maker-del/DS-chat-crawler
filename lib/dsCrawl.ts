import * as cheerio from "cheerio";

function cleanText(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
}

export async function getUrlsFromSitemap(sitemapUrl: string, limit: number) {
  const res = await fetch(sitemapUrl);
  if (!res.ok) throw new Error(`Failed to fetch sitemap: ${res.status}`);
  const xml = await res.text();

  // Basic sitemap parsing (works for simple sitemap.xml)
  const $ = cheerio.load(xml, { xmlMode: true });
  const urls: string[] = [];

  $("url > loc").each((_, el) => {
    const loc = $(el).text().trim();
    if (loc.startsWith("https://www.davis-stirling.com/")) urls.push(loc);
  });

  return urls.slice(0, limit);
}

export async function fetchPageAsText(url: string) {
  const res = await fetch(url, {
    headers: {
      // polite user agent
      "User-Agent": "DS-Knowledge-Refresh/1.0",
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
