# Rail Extension Tracker

A directory of proposed, planned, and under-construction passenger rail projects across the United States, Canada, and Mexico. These include light rail, heavy rail, commuter rail, streetcar, intercity, and high-speed rail. Each project has a short summary, key facts (agency, status, length, cost, and opening date), source references, and an alignment map when one is available.

**Live site:** https://railextensions.com

The site is built with [Astro](https://astro.build) and [Tailwind CSS](https://tailwindcss.com) and is fully static.

## Local development

You need Node.js 22.12 or newer.

| Command               | Action                                   |
| :-------------------- | :--------------------------------------- |
| `npm install`         | Install dependencies                     |
| `npm run dev`         | Start the dev server at `localhost:4321` |
| `npm run build`       | Build the production site to `./dist/`   |
| `npm run preview`     | Preview the production build locally     |
| `npm run check:links` | Check every reference URL for dead links |

## Repo layout

```text
src/
├── content/projects/   # One Markdown file per project (frontmatter = data, body = description)
├── content.config.ts   # Zod schema for project frontmatter
├── lib/regions.ts      # Valid region codes for the `state` field (US, Canada, Mexico)
├── components/         # MapView, ReferenceList, StatusBadge
├── layouts/            # BaseLayout
└── pages/              # Index, /map, /projects, /states, /agencies
public/
└── geometry/           # Optional GeoJSON alignments, one per project
scripts/                # Geometry validation, reference link check, OG image build
```

- **`src/content/projects/<slug>.md`**: each project is a Markdown file. The frontmatter fields (`projectName`, `agency`, `state`, `alignmentSummary`, `status`, `mode`, `references`, and others) are validated against the schema in `src/content.config.ts`. The filename becomes the project's URL slug.
- **`public/geometry/<slug>.geojson`**: an optional GeoJSON `FeatureCollection` with the project's alignment and stations. It must use the same slug as the Markdown file, and the project needs `hasGeometry: true` in its frontmatter so the map is shown. Run `npm run validate:geometry` to check that geometry files and frontmatter are in sync, parse as valid GeoJSON, use `[lng, lat]` order within North America, and contain the project's `coordinates`. CI runs this on every pull request.
- **Reference links**: a weekly GitHub Actions workflow (`.github/workflows/check-links.yml`) runs `npm run check:links` against every `references[].url`. When links are broken, it opens or updates a single issue labeled `dead-links` and closes it once they're fixed. Sites that block bots or rate-limit (403, 429, 5xx, timeouts) are listed as "uncertain" and don't open an issue. Add hosts that always block the checker to `scripts/link-check-ignore.txt`.
- **`src/lib/regions.ts`**: the list of region codes allowed in the `state` field. US entries use USPS codes, Canadian entries use postal province/territory codes, and Mexican entries use ISO 3166-2:MX three-letter codes. The build fails if a project uses a code that isn't listed here.

## Contributing

Corrections, new projects, and better alignment data are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the project data format, sourcing expectations, and how to add geometry.

Short version: add or edit a file in `src/content/projects/`, cite reliable sources under `references`, run `npm run build` to check that it validates, and open a pull request.
