import fs from "fs";
import path from "path";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const dir = path.join(process.cwd(), "crawl-output");

if (!fs.existsSync(dir)) {
  console.error("crawl-output folder not found");
  process.exit(1);
}

const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".txt"))
  .map((f) => path.join(dir, f));

console.log("Files found:", files.length);

// 1) Create vector store
const store = await client.vectorStores.create({
  name: `ds-site-${new Date().toISOString()}`,
});

console.log("Vector store created:", store.id);

// 2) Upload files
const uploadedIds = [];

for (const filePath of files) {
  const file = await client.files.create({
    purpose: "assistants",
    file: fs.createReadStream(filePath),
  });
  uploadedIds.push(file.id);
}

console.log("Uploaded files:", uploadedIds.length);

// 3) Attach files to vector store and wait
const batch = await client.vectorStores.fileBatches.createAndPoll(
  store.id,
  { file_ids: uploadedIds }
);

console.log("Indexing status:", batch.status);

if (batch.status !== "completed") {
  console.error("Vector store indexing failed");
  process.exit(1);
}

console.log("✅ DONE");
console.log("VECTOR_STORE_ID =", store.id);
