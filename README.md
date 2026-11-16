[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/gaiaoagoaia-art/frontend-witnessed/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/gaiaoagoaia-art/frontend-witnessed/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

# Lean Board — a make.fun frontend

A small, dependency-free frontend for [make.fun](https://make.fun), built for
the **makefun-frontend-01** bounty. It is plain static files — no framework,
no build step — reading make.fun's public API with GET requests only.

## The four surfaces

| Route | Surface |
| --- | --- |
| `#/` | The bounty board: every live bounty with its live pot, entry fee, time left and entry count |
| `#/bounty/<slug>` | A bounty's page: summary, description and rules, the rewards table at the live pot, dates and status, its entries |
| `#/bounty/<slug>/leaderboard` | That bounty's leaderboard, with view switching and a local filter |
| `#/profile/<handle>` | An account's public profile: record across all its bounties and its entries |

## How it stays fast

- The first load is a thin router (`app/main.js`), one stylesheet and two
  small shared helpers; each view is a separate ES module fetched with
  `import()` only when its route is opened.
- API answers are cached in memory with their ETags and revalidated with
  `If-None-Match` — the API's tags turn over each minute, so repeat views
  cost a 304 instead of a full download. Overlapping reads of the same URL
  share one request.
- Long lists page in place: the board follows the API's cursor, the
  leaderboard paints 100 rows at a time, and a bounty's entries reveal
  progressively from the one detail answer.
- Whether a bounty still takes entries is decided by its deadline, never
  its status — a bounty past its deadline can still read `open` until its
  results are published.

## Layout

- `app/` — the frontend itself (`index.html`, `main.js`, `api.js`,
  `format.js`, `style.css`, `views/`)
- `main.ts` — the hand-in program: copies `app/` and `screenshots/` to the
  output directory and writes `dossier.json` with the kit's library
- `vendor/makefun-frontend.ts` — the kit's dossier library, unchanged
- `serve.ts` — a tiny static server for trying the app locally
- `screenshots/` — three captures of the running app on live data
- `shots.json` — the file, route and viewport of each screenshot

## Run it locally

```sh
node serve.ts --port 8080
# open http://localhost:8080/
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

MIT licensed — see `LICENSE`.
