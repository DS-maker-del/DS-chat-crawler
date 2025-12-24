import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const baseUrl = process.env.DS_SITEMAP_URL;
const crawlToken = process.env.DS_CRAWL_TOKEN || "";
const maxPages = Number(process.env.DS_MAX_PAGES || "2000");


if (!baseUrl) {
  console.error("Missing DS_SITEMAP_URL in .env.local");
  process.exit(1);
}

const outDir = path.join(process.cwd(), "crawl-output");
mkdirSync(outDir, { recursive: true });

// --- Minimal sitemap XML parser (no extra packages) ---
async function getUrlsFromSitemap(sitemapUrl, limit) {
  const res = await fetch(sitemapUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/xml,text/xml;q=0.9,*/*;q=0.8",
      "X-DS-Crawler-Token": crawlToken,
    },
  });

  if (!res.ok) throw new Error(`Failed to fetch sitemap: ${res.status}`);

  const xml = await res.text();

  const locMatches = [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)]
    .map((m) => m[1].trim())
    .filter((u) => u.startsWith("https://www.davis-stirling.com/"));

  // de-dupe
  const unique = Array.from(new Set(locMatches));
  return unique.slice(0, limit);
}

async function fetchPageAsText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "X-DS-Crawler-Token": crawlToken,
    },
  });

  if (!res.ok) throw new Error(`Failed to fetch page ${url}: ${res.status}`);

  const html = await res.text();

  // quick-and-dirty text cleanup (good enough for local crawl)
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return `URL: ${url}\n\n${text}`;
}

function safeFileName(url, i) {
  return `${String(i).padStart(4, "0")}_${url
    .replace("https://www.davis-stirling.com/", "")
    .replace(/[^a-zA-Z0-9-_]+/g, "_")
    .slice(0, 120)}.txt`;
}

console.log("Starting local crawl:", { baseUrl, maxPages });

const urls = await getUrlsFromSitemap(baseUrl, maxPages);
console.log("URLs found:", urls.length);

let success = 0;

for (let i = 0; i < urls.length; i++) {
  const url = urls[i];
  const lowerUrl = url.toLowerCase();

  // Skip non-legal / unwanted sections
  if (
    lowerUrl.includes("/logon") ||
    lowerUrl.includes("/join-us") ||
    lowerUrl.includes("/humor") ||
    lowerUrl.includes("/resources") ||
    lowerUrl.includes("/commercial-cids") ||
    lowerUrl.includes("/clients") ||
    lowerUrl.includes("/home/statutes") ||
    lowerUrl.includes("/home/case-law") ||
    lowerUrl.includes("/home/new-laws")
  ) {
    continue;
  }

  try {
    const doc = await fetchPageAsText(url);
    const filename = safeFileName(url, i);
    writeFileSync(path.join(outDir, filename), doc, "utf8");
    success++;
    process.stdout.write(`Saved ${success}/${urls.length}\r`);
    await new Promise((r) => setTimeout(r, 250)); // polite delay
  } catch (e) {
    console.log("\nError:", url, e?.message || e);
  }
}


console.log(`\nDone. Saved ${success} files to: ${outDir}`);
