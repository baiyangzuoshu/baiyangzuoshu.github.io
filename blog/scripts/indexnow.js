"use strict";

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_ENDPOINT = "https://api.indexnow.org/indexnow";
const DEFAULT_BATCH_SIZE = 10000;

function toObject(value) {
  if (value && typeof value === "object") {
    return value;
  }

  return {};
}

function readConfigValue(value, envName) {
  const envValue = process.env[envName];
  if (typeof envValue === "string" && envValue.trim()) {
    return envValue.trim();
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return value;
}

function toBoolean(value, defaultValue) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

function toPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeOrigin(siteUrl) {
  try {
    const parsed = new URL(siteUrl);
    return parsed.origin;
  } catch (_error) {
    return "";
  }
}

function getIndexNowConfig(config) {
  const indexnow = toObject(config.indexnow);
  const siteUrl = readConfigValue(config.url, "SITE_URL");
  const origin = normalizeOrigin(siteUrl);
  const key = readConfigValue(indexnow.key, "INDEXNOW_KEY");

  return {
    enabled: toBoolean(readConfigValue(indexnow.enable, "INDEXNOW_ENABLED"), false),
    endpoint: readConfigValue(indexnow.endpoint, "INDEXNOW_ENDPOINT") || DEFAULT_ENDPOINT,
    key,
    host: origin ? new URL(origin).host : "",
    keyLocation:
      readConfigValue(indexnow.key_location, "INDEXNOW_KEY_LOCATION") ||
      (origin && key ? `${origin}/${key}.txt` : ""),
    batchSize: Math.min(
      toPositiveInteger(readConfigValue(indexnow.batch_size, "INDEXNOW_BATCH_SIZE"), DEFAULT_BATCH_SIZE),
      DEFAULT_BATCH_SIZE
    ),
    dryRun: toBoolean(readConfigValue(indexnow.dry_run, "INDEXNOW_DRY_RUN"), false),
    publicDir: config.public_dir || "public",
  };
}

function listMissingFields(indexnow) {
  const missing = [];

  if (!indexnow.host) {
    missing.push("host");
  }

  if (!indexnow.key) {
    missing.push("key");
  }

  if (!indexnow.keyLocation) {
    missing.push("key_location");
  }

  return missing;
}

function readSitemapUrls(publicDir) {
  const sitemapTxtPath = path.join(publicDir, "sitemap.txt");

  if (!fs.existsSync(sitemapTxtPath)) {
    throw new Error(`Missing sitemap file: ${sitemapTxtPath}`);
  }

  const lines = fs
    .readFileSync(sitemapTxtPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return Array.from(new Set(lines));
}

function createPayload(indexnow, urls) {
  return {
    host: indexnow.host,
    key: indexnow.key,
    keyLocation: indexnow.keyLocation,
    urlList: urls,
  };
}

async function postBatch(indexnow, urls) {
  const response = await fetch(indexnow.endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
      "user-agent": "baiyangzuoshu-hexo-indexnow",
    },
    body: JSON.stringify(createPayload(indexnow, urls)),
  });

  const body = (await response.text()).trim();

  if (!response.ok) {
    throw new Error(
      `IndexNow request failed with ${response.status} ${response.statusText}${body ? `: ${body}` : ""}`
    );
  }

  return body;
}

async function submitIndexNow(hexo, options = {}) {
  const logger = hexo.log;
  const indexnow = getIndexNowConfig(hexo.config);

  if (!indexnow.enabled) {
    logger.info("[indexnow] skipped because it is disabled");
    return;
  }

  const missing = listMissingFields(indexnow);
  if (missing.length) {
    const error = new Error(`[indexnow] skipped because required config is missing: ${missing.join(", ")}`);
    if (options.failOnError) {
      throw error;
    }

    logger.warn(error.message);
    return;
  }

  const publicDir = path.join(hexo.base_dir, indexnow.publicDir);
  const urls = readSitemapUrls(publicDir);

  if (!urls.length) {
    logger.warn("[indexnow] skipped because sitemap.txt is empty");
    return;
  }

  const batches = [];
  for (let i = 0; i < urls.length; i += indexnow.batchSize) {
    batches.push(urls.slice(i, i + indexnow.batchSize));
  }

  if (indexnow.dryRun) {
    logger.info(
      `[indexnow] dry run: ${urls.length} URLs prepared in ${batches.length} batch(es), key file ${indexnow.keyLocation}`
    );
    return;
  }

  for (let i = 0; i < batches.length; i += 1) {
    const batch = batches[i];
    const body = await postBatch(indexnow, batch);
    logger.info(
      `[indexnow] submitted batch ${i + 1}/${batches.length} with ${batch.length} URL(s)${
        body ? `, response: ${body}` : ""
      }`
    );
  }
}

hexo.extend.console.register(
  "indexnow",
  "Submit sitemap URLs to IndexNow",
  async function indexNowCommand() {
    await submitIndexNow(hexo, { failOnError: true });
  }
);

hexo.extend.filter.register("after_deploy", async function indexNowAfterDeploy() {
  try {
    await submitIndexNow(hexo, { failOnError: false });
  } catch (error) {
    hexo.log.warn(`[indexnow] ${error.message}`);
  }
});
