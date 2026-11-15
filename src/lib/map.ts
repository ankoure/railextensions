// Shared Leaflet setup for the project detail map and the overview map.
// Client-side only: import from bundled <script> tags, not frontmatter.

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export { L };

export const DEFAULT_LINE_COLOR = '#1d4ed8';
export const EXISTING_STATION_COLOR = '#6b7280';

/** Geographic center of the contiguous US, used when nothing better is known. */
export const US_CENTER: L.LatLngTuple = [39.5, -98.35];

// OSM tile usage policy: use the single `tile.openstreetmap.org` host (the
// `{s}` subdomain form is deprecated), show attribution on the map, and don't
// exceed zoom 19. Heavy production traffic should move to a commercial or
// self-hosted provider; swap the URL here when that happens.
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

export function createMap(
  el: HTMLElement,
  options: { center?: L.LatLngTuple; zoom?: number; scrollWheelZoom?: boolean } = {},
): L.Map {
  const map = L.map(el, { scrollWheelZoom: options.scrollWheelZoom ?? false })
    .setView(options.center ?? US_CENTER, options.zoom ?? 4);
  L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(map);
  return map;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!
  ));
}

export async function fetchGeometry(entryId: string): Promise<GeoJSON.GeoJsonObject> {
  const res = await fetch(`/geometry/${entryId}.geojson`);
  if (!res.ok) throw new Error(`No geometry for ${entryId}`);
  return res.json();
}

export function stationMarker(
  latlng: L.LatLngExpression,
  opts: { color?: string; radius?: number; weight?: number; fillOpacity?: number } = {},
): L.CircleMarker {
  return L.circleMarker(latlng, {
    radius: opts.radius ?? 7,
    fillColor: opts.color ?? DEFAULT_LINE_COLOR,
    color: '#ffffff',
    weight: opts.weight ?? 2.5,
    fillOpacity: opts.fillOpacity ?? 1,
  });
}

/**
 * Build a GeoJSON layer for a project alignment: lines drawn in `color`,
 * stations as circle markers (grey when `properties.existing === true`).
 */
export function alignmentLayer(
  data: GeoJSON.GeoJsonObject,
  opts: {
    color?: string;
    lineWeight?: number;
    stationRadius?: number;
    stationWeight?: number;
    onEachFeature?: L.GeoJSONOptions['onEachFeature'];
  } = {},
): L.GeoJSON {
  const color = opts.color ?? DEFAULT_LINE_COLOR;
  return L.geoJSON(data, {
    style: feat => {
      const t = feat?.geometry?.type;
      return t === 'LineString' || t === 'MultiLineString'
        ? { color, weight: opts.lineWeight ?? 5, opacity: 0.85 }
        : {};
    },
    pointToLayer: (feat, latlng) => stationMarker(latlng, {
      color: feat.properties?.existing === true ? EXISTING_STATION_COLOR : color,
      radius: opts.stationRadius,
      weight: opts.stationWeight,
    }),
    onEachFeature: opts.onEachFeature,
  });
}
