// Checks every `references[].url` in src/content/projects/*.md for dead links.
//
// Each unique URL is fetched with GET (many news sites mishandle HEAD),
// following redirects. Results fall into three buckets:
//   - ok:        2xx after redirects
//   - broken:    404/410 or other definite 4xx, DNS failure, TLS certificate error
//   - uncertain: 401/403/429/999, unfollowable 3xx, 5xx, timeouts, connection resets — the usual
//                signs of bot blocking, rate limiting, or a temporary outage.
//                These are reported but don't fail the run.
// Transient failures (429, 5xx, network errors) are retried with backoff.
// Requests to the same host run one at a time with a short delay between them.
//
// URLs matching a pattern in scripts/link-check-ignore.txt are skipped.
//
// Usage: node scripts/check-reference-links.mjs [--output report.md] [--no-fail]
// Exits 1 if any link is broken, unless --no-fail is given.
// Dependency-free so it runs before `npm ci`.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const contentDir = path.join(root, 'src/content/projects');
const ignoreFile = path.join(root, 'scripts/link-check-ignore.txt');

const TIMEOUT_MS = 20_000;
const ATTEMPTS = 3;
const MAX_RETRY_AFTER_MS = 30_000;
const CONCURRENCY = 8; // hosts checked in parallel
const SAME_HOST_DELAY_MS = 1_000;
const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

const args = process.argv.slice(2);
const outputPath = args.includes('--output') ? args[args.indexOf('--output') + 1] : undefined;
const noFail = args.includes('--no-fail');

// ---------------------------------------------------------------------------
// Extract references

function frontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : '';
}

function unquote(s) {
  s = s.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

// Returns [{ title, url }] from the `references:` block sequence.
function parseReferences(fm) {
  const block = fm.match(/^references:[ \t]*\r?\n((?:(?:[ \t]+.*)?\r?\n?)+)/m);
  if (!block) return [];
  const refs = [];
  let current;
  for (const line of block[1].split(/\r?\n/)) {
    const item = line.match(/^[ \t]*-[ \t]+(\w+):[ \t]*(.*)$/);
    const prop = line.match(/^[ \t]+(\w+):[ \t]*(.*)$/);
    if (item) {
      current = {};
      refs.push(current);
      current[item[1]] = unquote(item[2]);
    } else if (prop && current) {
      current[prop[1]] = unquote(prop[2]);
    }
  }
  return refs.filter((r) => r.url);
}

const files = (await readdir(contentDir)).filter((f) => f.endsWith('.md')).sort();

// url -> [{ file, title }]
const citations = new Map();
for (const name of files) {
  const fm = frontmatter(await readFile(path.join(contentDir, name), 'utf8'));
  for (const ref of parseReferences(fm)) {
    if (!citations.has(ref.url)) citations.set(ref.url, []);
    citations.get(ref.url).push({ file: `src/content/projects/${name}`, title: ref.title ?? '' });
  }
}

// ---------------------------------------------------------------------------
// Ignore list: one pattern per line. A pattern containing "/" is a URL prefix;
// otherwise it's a hostname that also matches its subdomains.

async function loadIgnore() {
  let text = '';
  try {
    text = await readFile(ignoreFile, 'utf8');
  } catch {
    return [];
  }
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/#.*/, '').trim())
    .filter(Boolean);
}

const ignorePatterns = await loadIgnore();

function isIgnored(url) {
  let host;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  return ignorePatterns.some((p) =>
    p.includes('/') ? url.startsWith(p) : host === p.toLowerCase() || host.endsWith(`.${p.toLowerCase()}`),
  );
}

// ---------------------------------------------------------------------------
// Checking

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BROKEN_NET_CODES = new Set([
  'ENOTFOUND',
  'EAI_AGAIN', // retried first; persistent means the name doesn't resolve
  'CERT_HAS_EXPIRED',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
]);
const UNCERTAIN_STATUS = new Set([401, 403, 408, 429, 999]);

function classifyStatus(status) {
  if (status >= 200 && status < 300) return 'ok';
  // A 3xx that fetch couldn't follow has no usable Location header, which is
  // typically a bot-protection challenge (e.g. Sucuri) rather than a dead page.
  if (UNCERTAIN_STATUS.has(status) || (status >= 300 && status < 400) || status >= 500) return 'uncertain';
  return 'broken';
}

function retryable(status) {
  return status === 408 || status === 429 || status >= 500;
}

function retryDelay(attempt, res) {
  const header = res?.headers.get('retry-after');
  if (header) {
    const secs = Number(header);
    const ms = Number.isFinite(secs) ? secs * 1000 : Date.parse(header) - Date.now();
    if (ms > 0) return Math.min(ms, MAX_RETRY_AFTER_MS);
  }
  return 2 ** attempt * 2_000;
}

async function fetchOnce(url) {
  const res = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  // Only the status matters; don't download the body.
  await res.body?.cancel().catch(() => {});
  return res;
}

async function check(url) {
  let last;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(retryDelay(attempt, last?.res));
    try {
      const res = await fetchOnce(url);
      last = { res, status: res.status, result: classifyStatus(res.status), detail: `HTTP ${res.status}` };
      if (!retryable(res.status)) break;
    } catch (err) {
      const timedOut = err.name === 'TimeoutError';
      const code = timedOut ? 'TimeoutError' : (err.cause?.code ?? err.cause?.name ?? err.name);
      const detail = timedOut ? `timeout after ${TIMEOUT_MS / 1000}s` : String(code ?? err.message);
      last = { result: BROKEN_NET_CODES.has(code) ? 'broken' : 'uncertain', detail };
      if (code === 'ENOTFOUND') break;
    }
  }
  return { result: last.result, detail: last.detail };
}

const results = new Map(); // url -> { result, detail }

for (const url of citations.keys()) {
  if (isIgnored(url)) results.set(url, { result: 'skipped', detail: 'ignore list' });
}

// Group remaining URLs by host so each host is hit serially.
const byHost = new Map();
for (const url of citations.keys()) {
  if (results.has(url)) continue;
  let host;
  try {
    host = new URL(url).hostname;
  } catch {
    results.set(url, { result: 'broken', detail: 'invalid URL' });
    continue;
  }
  if (!byHost.has(host)) byHost.set(host, []);
  byHost.get(host).push(url);
}

const queue = [...byHost.values()];
let done = 0;
const total = [...byHost.values()].reduce((n, urls) => n + urls.length, 0);

async function worker() {
  while (queue.length) {
    const urls = queue.shift();
    for (const [i, url] of urls.entries()) {
      if (i > 0) await sleep(SAME_HOST_DELAY_MS);
      const r = await check(url);
      results.set(url, r);
      done++;
      if (r.result !== 'ok') console.log(`[${done}/${total}] ${r.result.padEnd(9)} ${r.detail.padEnd(12)} ${url}`);
    }
  }
}

console.log(`Checking ${total} unique reference URLs across ${files.length} projects...`);
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

// ---------------------------------------------------------------------------
// Report

const buckets = { ok: [], broken: [], uncertain: [], skipped: [] };
for (const [url, r] of results) buckets[r.result].push({ url, ...r });

function section(entries) {
  // Group by file so maintainers can fix one project at a time.
  const byFile = new Map();
  for (const e of entries) {
    for (const c of citations.get(e.url)) {
      if (!byFile.has(c.file)) byFile.set(c.file, []);
      byFile.get(c.file).push({ ...e, title: c.title });
    }
  }
  const lines = [];
  for (const file of [...byFile.keys()].sort()) {
    lines.push(`- [ ] \`${file}\``);
    for (const e of byFile.get(file)) {
      const title = e.title.replace(/[[\]]/g, '');
      lines.push(`  - ${e.detail} — [${title || e.url}](${e.url})`);
    }
  }
  return lines.join('\n');
}

const summary = `Checked ${total} unique reference URLs from ${files.length} projects: ${buckets.ok.length} ok, ${buckets.broken.length} broken, ${buckets.uncertain.length} uncertain, ${buckets.skipped.length} skipped.`;

const report = [
  summary,
  '',
  '## Broken',
  '',
  buckets.broken.length
    ? 'These returned a definite error (404/410 or similar, unresolvable domain, bad TLS certificate). Replace each with a working source or an archived copy (e.g. web.archive.org).'
    : 'None.',
  '',
  section(buckets.broken),
  '',
  '<details>',
  `<summary>Uncertain (${buckets.uncertain.length}) — likely bot blocking, rate limiting, or a temporary outage</summary>`,
  '',
  'Check these by hand. If a site always blocks the checker, add its host to `scripts/link-check-ignore.txt`.',
  '',
  section(buckets.uncertain),
  '',
  '</details>',
  '',
].join('\n');

console.log(`\n${summary}`);
if (outputPath) await writeFile(outputPath, report);

if (buckets.broken.length && !noFail) process.exit(1);
