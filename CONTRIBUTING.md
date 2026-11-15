# Contributing

Thanks for helping keep the tracker accurate. Most contributions are one of these:

- **Adding a project:** a new Markdown file in `src/content/projects/`.
- **Updating a project:** new facts, a new `## Updates` entry, or a status change.
- **Adding or fixing geometry:** a GeoJSON file in `public/geometry/`.

Before you open a pull request, run `npm run build`. The build checks every project's frontmatter against the schema in `src/content.config.ts` and fails if a field is missing, misspelled, or uses a value that isn't allowed.

## File naming

Each project is one file: `src/content/projects/<slug>.md`. The filename (without `.md`) is the entry ID. It is used in the project's URL (`/projects/<slug>`) and as the name of its geometry file.

Name files `<agency>-<project>`, all lowercase, words joined with hyphens:

- `mbta-blue-line-lynn-extension`
- `metrolinx-ontario-line`
- `la-metro-k-line-torrance-extension`

Use the agency's usual short name or abbreviation (`mbta`, `metrolinx`, `la-metro`, `bart`). If the project is better known by its own brand than by its agency, or has no single sponsoring agency, the project name alone is fine (`brightline-west`, `alto-high-speed-rail`, `baltimore-red-line`). Don't rename existing files, because that changes their URLs.

## Frontmatter

The frontmatter holds the project's data. The schema is defined in [`src/content.config.ts`](src/content.config.ts).

### Required fields

| Field | Type | Notes |
| :---- | :--- | :---- |
| `projectName` | string | The project's full public name, e.g. `"Blue Line Extension to Lynn"`. |
| `agency` | string | Full name of the lead agency, e.g. `"Massachusetts Bay Transportation Authority"`. |
| `state` | string | Region code. See [Region codes](#region-codes). |
| `alignmentSummary` | string | One to three sentences: where the line goes, how long it is, and where things stand. It appears in project lists and at the top of the project page. |

### Optional fields

| Field | Type | Notes |
| :---- | :--- | :---- |
| `agencyAbbr` | string | Short agency name, e.g. `"MBTA"`. |
| `location` | string | Endpoints or corridor in plain words, e.g. `"Wonderland, Revere, to Lynn, MA"`. |
| `status` | enum | See [Status](#status). |
| `mode` | enum | See [Mode](#mode). |
| `lengthMiles` | number | Length of the new segment in miles. Convert from kilometres if needed (1 km = 0.621 mi). |
| `estimatedCost` | string | Free text. Always say whose estimate it is and what year it is from. See [Costs](#costs). |
| `proposedOpening` | string | Free text, e.g. `"2029"`, `"2032–2033"`, `"2031 or later"`. |
| `coordinates` | `{ lat, lng }` | A single point near the middle of the project. It places the project on the overview map. |
| `hasGeometry` | boolean | Set to `true` only when `public/geometry/<slug>.geojson` exists. |
| `lastUpdated` | date | `YYYY-MM-DD`. See [When to bump `lastUpdated`](#when-to-bump-lastupdated). |
| `references` | list | Sources. See [Sourcing](#sourcing). Defaults to an empty list, but every project should have at least one. |

Each item in `references` has:

| Field | Required | Notes |
| :---- | :------- | :---- |
| `title` | yes | The headline or document title, as published (in its original language). |
| `url` | yes | A full URL. |
| `publication` | no, but expected | The outlet or agency, e.g. `"Boston Globe"`, `"Metrolinx"`. |
| `date` | no, but expected | Publication date, `YYYY-MM-DD`. |

List references newest first.

### Status

Pick the stage the project has actually reached, not the one it's aiming for.

| Value | Use when |
| :---- | :------- |
| `proposed` | An idea from an agency, elected official, or advocacy group, with no formal planning study under way. |
| `planning` | An agency is studying the project: alternatives analysis, feasibility study, or choosing a preferred alignment. |
| `environmental-review` | The project is in formal environmental review (NEPA/CEQA in the US, an environmental assessment in Canada, or the equivalent in Mexico), or design work is advancing toward a funding decision. |
| `funded` | Construction funding is committed (for example, a signed FTA Full Funding Grant Agreement or an approved government budget), but major construction hasn't started. |
| `under-construction` | Main civil works have started. Utility relocation or early works alone don't count unless the agency calls it the start of construction. |
| `on-hold` | Work has been formally paused, or funding was withdrawn without the project being cancelled. |
| `completed` | The project is open to passengers. |
| `cancelled` | The sponsoring agency or government has formally ended the project. |

### Mode

| Value | Use for |
| :---- | :------ |
| `light-rail` | Light rail and LRT, including light metros that run at street level for part of the route. |
| `heavy-rail` | Subways, elevated metros, and fully grade-separated automated metros (SkyTrain, REM). |
| `commuter-rail` | Regional rail serving commuters into a city centre. |
| `streetcar` | Streetcars and trams that mostly run in mixed traffic. |
| `intercity` | Conventional-speed passenger rail between cities. |
| `high-speed` | Intercity rail designed for roughly 125 mph (200 km/h) or faster. |
| `monorail` | Monorail. |
| `brt` | Bus rapid transit. |

## Region codes

The `state` field takes a region code from [`src/lib/regions.ts`](src/lib/regions.ts). The build fails if the code isn't listed there.

- **United States:** USPS two-letter codes (`MA`, `CA`, `DC`, `PR`).
- **Canada:** postal two-letter province and territory codes (`ON`, `BC`, `QC`).
- **Mexico:** ISO 3166-2:MX three-letter codes (`CMX` for Mexico City, `NLE` for Nuevo León, `JAL` for Jalisco). These are three letters so they never collide with US or Canadian codes.

For a project that crosses state lines, use the state where most of it is, or where the lead agency is based, and name the other states in `location` and `alignmentSummary`.

## Body

The Markdown body follows the frontmatter and has two sections, in this order:

```markdown
## Alignment

Where the line runs, its stations, and how it connects to the existing network.
Then key facts: length, grade separation, trip times, ridership estimates, vehicles,
and who is building and paying for it. Bold station names the first time they appear.

## Updates

### 2026-09 — Works reach 45%; first train car arrives
What happened, with dates and figures, in a short paragraph.

### 2025-03 — Construction begins
...
```

- Each update is a `###` heading in the form `YYYY-MM — headline`. Use an em dash (`—`) with a space on each side.
- List updates **newest first**.
- Keep headlines short and factual. Put the detail in the paragraph below.
- Every fact in an update should be backed by an entry in `references`.
- When a project changes (a new cost, a delay, a new status), add an update entry and also correct the frontmatter and `## Alignment`, so the top of the page reflects current facts.

## Geometry

Projects can have an alignment map. Geometry goes in `public/geometry/<slug>.geojson`, using the same slug as the Markdown file. Set `hasGeometry: true` in the frontmatter, or the map won't be shown.

The file must be a GeoJSON `FeatureCollection`:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "type": "alignment", "name": "Blue Line extension (Wonderland–Lynn)" },
      "geometry": {
        "type": "LineString",
        "coordinates": [[-70.9917, 42.4135], [-70.9488, 42.4625]]
      }
    },
    {
      "type": "Feature",
      "properties": { "type": "station", "name": "Wonderland", "existing": true },
      "geometry": { "type": "Point", "coordinates": [-70.9917, 42.4135] }
    },
    {
      "type": "Feature",
      "properties": { "type": "station", "name": "Lynn" },
      "geometry": { "type": "Point", "coordinates": [-70.9488, 42.4625] }
    }
  ]
}
```

- **Coordinates are `[lng, lat]`**, longitude first, as GeoJSON requires. This is the reverse of the frontmatter's `coordinates: { lat, lng }`. In North America, longitudes are negative, so a pair like `[42.4, -70.9]` is in the wrong order.
- `properties.type` is `"alignment"` for lines (`LineString` or `MultiLineString`) and `"station"` for stations (`Point`).
- `properties.name` is required on every feature. It is shown when you click the feature on the map.
- Add `"existing": true` to stations that are already open, such as the station a new extension branches from. These are drawn in grey; new stations are drawn in blue.
- If a station location or alignment is only roughly known, say so in its name, e.g. `"Preston (approximate)"`.
- You can include more than one alignment, for example separate features for each phase or branch. Name each one clearly.
- Round coordinates to five decimal places (about 1 m).

## Sourcing

Every fact should be traceable to a source in `references`.

- **Prefer primary sources:** agency project pages, board documents and presentations, environmental documents, FTA project profiles, government budgets, and official press releases.
- **Use reputable news outlets** for events, quotes, and context, and for facts that agencies haven't published. Local and trade press (for example *Railway Age* or *Trains*) are fine.
- **Include `publication` and `date`** on every reference.
- **Label opinion pieces** by adding `(opinion)` to the publication, e.g. `publication: "CommonWealth Beacon (opinion)"`. Don't state an opinion piece's claims as facts in the summary.
- Avoid wikis, forums, and social media posts unless they're an agency's or official's own account and there's no better source.
- Non-English sources are welcome. Keep the original title in `title` and write the entry in English.
- When sources disagree, use the most recent primary source and mention the difference if it matters (for example, "the train contract calls for 130 km/h, while the project sheet gives 120 km/h").

### Costs

Cost figures change often and mean different things, so `estimatedCost` should always say:

- **The currency**, when it isn't US dollars: `C$` for Canadian dollars, `MX$` for Mexican pesos.
- **The year of the estimate**, and whose estimate it is.
- **What it covers**, if that isn't the whole project (one phase, including or excluding financing).

Good examples:

- `"$8.2B (FTA project profile, including financing)"`
- `"$21.5B (2025 estimate; up from about $12B in 2024)"`
- `"C$3.3–3.8B (TransLink 2019 estimate, 2018 dollars); no current estimate"`

## When to bump `lastUpdated`

`lastUpdated` is the date you last checked the entry against current sources and changed it. The home page and state pages sort projects by this date, so it signals which entries are fresh.

Set it to today's date when you:

- add an entry to `## Updates`,
- change a fact: status, cost, opening date, length, alignment, or stations,
- add new references that support new or corrected facts, or
- review the whole entry against current sources and confirm it's still accurate.

Don't bump it for typo fixes, wording or formatting changes, broken-link fixes with no change in content, or geometry-only changes.

## Checklist

Before opening a pull request:

- [ ] The filename follows `<agency>-<project>.md`.
- [ ] Required fields are present, and `state` is a valid region code.
- [ ] `status` and `mode` use the values above.
- [ ] `estimatedCost` names the estimate's year and source.
- [ ] The body has `## Alignment` and `## Updates`, with updates newest first.
- [ ] Every reference has a `publication` and `date`, and opinion pieces are labelled.
- [ ] If you added geometry, the file is named `<slug>.geojson`, uses `[lng, lat]`, and `hasGeometry: true` is set.
- [ ] `lastUpdated` is bumped if facts changed.
- [ ] `npm run build` passes.
