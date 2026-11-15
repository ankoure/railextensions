// Validates public/geometry/*.geojson against src/content/projects/*.md.
//
// Checks:
//   - every `hasGeometry: true` entry has a matching geometry file
//   - every geometry file has a matching content entry (no orphans)
//   - each file parses as a GeoJSON FeatureCollection with valid geometries
//   - coordinates are [lng, lat] and fall within North America
//   - the entry's `coordinates` fall inside (or near) the geometry's bounding box
//
// Usage: node scripts/validate-geometry.mjs
// Exits non-zero if any check fails. Dependency-free so it runs before `npm ci`.

import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const contentDir = path.join(root, 'src/content/projects');
const geometryDir = path.join(root, 'public/geometry');

// Rough North America envelope (incl. Alaska, Hawaii, Puerto Rico, Mexico).
const BOUNDS = { minLng: -180, maxLng: -50, minLat: 14, maxLat: 72 };
// How far (in degrees) the entry's marker may sit outside the geometry bbox.
const BBOX_PADDING_DEG = 0.25;

const GEOMETRY_TYPES = new Set([
  'Point', 'MultiPoint', 'LineString', 'MultiLineString',
  'Polygon', 'MultiPolygon', 'GeometryCollection',
]);

const errors = [];
const fail = (file, msg) => errors.push(`${file}: ${msg}`);

// ---------------------------------------------------------------------------
// Content entries

async function walk(dir, base = dir) {
  const out = [];
  for (const d of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) out.push(...(await walk(p, base)));
    else if (d.name.endsWith('.md')) out.push(path.relative(base, p));
  }
  return out;
}

function frontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : '';
}

// Minimal top-level YAML scalar lookup; enough for the fields we need.
function field(fm, name) {
  const m = fm.match(new RegExp(`^${name}:[ \\t]*(.*)$`, 'm'));
  return m ? m[1].trim() : undefined;
}

function parseCoordinates(fm) {
  const inline = field(fm, 'coordinates');
  if (inline === undefined) return undefined;
  let text = inline;
  if (text === '') {
    // Block mapping form:
    // coordinates:
    //   lat: 1
    //   lng: 2
    const block = fm.match(/^coordinates:[ \t]*\r?\n((?:[ \t]+.*\r?\n?)+)/m);
    text = block ? block[1] : '';
  }
  const lat = text.match(/\blat:\s*(-?[\d.]+)/);
  const lng = text.match(/\blng:\s*(-?[\d.]+)/);
  if (!lat || !lng) return undefined;
  return { lat: Number(lat[1]), lng: Number(lng[1]) };
}

// Mirrors Astro's glob loader: id is the path without extension, unless
// a `slug` frontmatter field overrides it.
function entryId(relPath, fm) {
  const slug = field(fm, 'slug');
  if (slug) return slug.replace(/^['"]|['"]$/g, '');
  return relPath.replace(/\.md$/, '').split(path.sep).join('/').toLowerCase();
}

const entries = new Map();
for (const rel of await walk(contentDir)) {
  const fm = frontmatter(await readFile(path.join(contentDir, rel), 'utf8'));
  entries.set(entryId(rel, fm), {
    file: path.join('src/content/projects', rel),
    hasGeometry: field(fm, 'hasGeometry') === 'true',
    coordinates: parseCoordinates(fm),
  });
}

// ---------------------------------------------------------------------------
// Geometry files

const geometryFiles = new Map();
for (const name of await readdir(geometryDir)) {
  if (!name.endsWith('.geojson')) continue;
  geometryFiles.set(name.replace(/\.geojson$/, ''), path.join('public/geometry', name));
}

// Sync checks
for (const [id, entry] of entries) {
  if (entry.hasGeometry && !geometryFiles.has(id)) {
    fail(entry.file, `hasGeometry: true but public/geometry/${id}.geojson is missing`);
  }
  if (!entry.hasGeometry && geometryFiles.has(id)) {
    fail(entry.file, `public/geometry/${id}.geojson exists but hasGeometry is not true`);
  }
}
for (const [id, file] of geometryFiles) {
  if (!entries.has(id)) fail(file, `no matching content entry src/content/projects/${id}.md`);
}

// Collect every position in a geometry, validating shape along the way.
function positions(geom, file, where, out) {
  if (!geom || typeof geom !== 'object') return fail(file, `${where}: geometry is missing`);
  if (!GEOMETRY_TYPES.has(geom.type)) return fail(file, `${where}: unknown geometry type ${JSON.stringify(geom.type)}`);
  if (geom.type === 'GeometryCollection') {
    if (!Array.isArray(geom.geometries)) return fail(file, `${where}: GeometryCollection without geometries`);
    geom.geometries.forEach((g, i) => positions(g, file, `${where}.geometries[${i}]`, out));
    return;
  }
  const depth = { Point: 0, MultiPoint: 1, LineString: 1, MultiLineString: 2, Polygon: 2, MultiPolygon: 3 }[geom.type];
  const visit = (node, d, loc) => {
    if (d === 0) {
      if (!Array.isArray(node) || node.length < 2 || !node.every((n) => typeof n === 'number' && Number.isFinite(n))) {
        return fail(file, `${loc}: invalid position ${JSON.stringify(node)}`);
      }
      out.push({ pos: node, loc });
      return;
    }
    if (!Array.isArray(node) || node.length === 0) return fail(file, `${loc}: expected non-empty array`);
    node.forEach((n, i) => visit(n, d - 1, `${loc}[${i}]`));
  };
  visit(geom.coordinates, depth, `${where} (${geom.type})`);
  if (geom.type === 'LineString' && Array.isArray(geom.coordinates) && geom.coordinates.length < 2) {
    fail(file, `${where}: LineString needs at least 2 positions`);
  }
}

for (const [id, file] of geometryFiles) {
  let data;
  try {
    data = JSON.parse(await readFile(path.join(root, file), 'utf8'));
  } catch (e) {
    fail(file, `invalid JSON: ${e.message}`);
    continue;
  }
  if (data?.type !== 'FeatureCollection') {
    fail(file, `expected type "FeatureCollection", got ${JSON.stringify(data?.type)}`);
    continue;
  }
  if (!Array.isArray(data.features) || data.features.length === 0) {
    fail(file, 'FeatureCollection has no features');
    continue;
  }

  const pts = [];
  data.features.forEach((f, i) => {
    if (f?.type !== 'Feature') return fail(file, `features[${i}]: expected type "Feature"`);
    positions(f.geometry, file, `features[${i}]`, pts);
  });

  let swappedHint = 0;
  for (const { pos: [lng, lat], loc } of pts) {
    if (lng < BOUNDS.minLng || lng > BOUNDS.maxLng || lat < BOUNDS.minLat || lat > BOUNDS.maxLat) {
      const looksSwapped = lat >= BOUNDS.minLng && lat <= BOUNDS.maxLng && lng >= BOUNDS.minLat && lng <= BOUNDS.maxLat;
      if (looksSwapped) swappedHint++;
      fail(file, `${loc}: [${lng}, ${lat}] is outside North America${looksSwapped ? ' (lat/lng swapped? GeoJSON is [lng, lat])' : ''}`);
    }
  }

  // Entry marker vs geometry bbox
  const coords = entries.get(id)?.coordinates;
  if (coords && pts.length && swappedHint === 0) {
    const lngs = pts.map((p) => p.pos[0]);
    const lats = pts.map((p) => p.pos[1]);
    const [minLng, maxLng, minLat, maxLat] = [Math.min(...lngs), Math.max(...lngs), Math.min(...lats), Math.max(...lats)];
    const p = BBOX_PADDING_DEG;
    if (coords.lng < minLng - p || coords.lng > maxLng + p || coords.lat < minLat - p || coords.lat > maxLat + p) {
      fail(
        entries.get(id).file,
        `coordinates { lat: ${coords.lat}, lng: ${coords.lng} } fall outside the geometry bounding box ` +
          `[${minLng}, ${minLat}, ${maxLng}, ${maxLat}] (+${p}° padding)`,
      );
    }
  }
}

// ---------------------------------------------------------------------------

if (errors.length) {
  console.error(`Geometry validation failed with ${errors.length} error(s):\n`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`✓ ${geometryFiles.size} geometry file(s) and ${entries.size} entr(ies) validated.`);
