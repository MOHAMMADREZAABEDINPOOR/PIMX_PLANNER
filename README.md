<div align="center">

<img src="assets/readme/hero.gif" width="1200" alt="PIMX PLANNER — rotating 3D geometry" />

**[English](README.md) · [فارسی](README.fa.md)**

<img src="assets/readme/identity.svg" width="1200" alt="web / English and Persian documentation" />

</div>

# PIMX PLANNER

A personal planning workspace with daily tasks, goals, study tracking, grades, reminders, a diary and a chat section. The repository contains React, Node/PostgreSQL, Django and Pages/D1 variants.

[GitHub](https://github.com/MOHAMMADREZAABEDINPOOR/PIMX_PLANNER) · [PIMX / Profile](https://github.com/MOHAMMADREZAABEDINPOOR) · [Static artwork](assets/readme/hero.png)

## Features

- Daily planner, calendar, goals and progress views
- Study sections, English practice and grade tracking
- Diary, reminders and assistant interface
- Alternative API/storage implementations

## Stack

| Tool | Version / source |
|---|---|
| React | `^19.2.0` |
| Vite | `^6.2.0` |
| TypeScript | `~5.8.2` |
| Express | `^4.22.1` |

## Getting started

Node.js 22.12+ and the package manager declared in package.json. Install dependencies from the checked-in lockfile where available.

```bash
git clone https://github.com/MOHAMMADREZAABEDINPOOR/PIMX_PLANNER.git
cd PIMX_PLANNER

npm ci
npm run dev
```

## Configuration

These names are found in the example configuration or source; not all are required. Check their defaults/usage in those files and supply secrets only in your local or hosting environment.

| Name | Role |
|---|---|
| `API_KEY` | Credential/connection setting; keep private |
| `DATABASE_URL` | Credential/connection setting; keep private |
| `GEMINI_API_KEY` | Credential/connection setting; keep private |
| `PG_CONNECTION_STRING` | Credential/connection setting; keep private |
| `PORT` | Application setting; inspect its definition |
| `VITE_API_BASE_URL` | Public browser configuration; never put secrets here |

Hosting bindings: `DB`.

## Usage

Run `npm run dev` for the interface. For persistent state choose one backend and configure the API URL. Read server/index.cjs for the Node/PostgreSQL path and functions/api/state.ts for Pages/D1.

## Project structure

| Path | Role |
|---|---|
| [`assets/`](assets/) | Brand/media/README assets |
| [`components/`](components/) | Reusable interface components |
| [`functions/`](functions/) | Hosting API functions |
| [`scripts/`](scripts/) | Development and maintenance utilities |
| [`server/`](server/) | Server implementation |
| [`templates/`](templates/) | Server-rendered templates |
| [`index.html`](index.html) | Project entry/configuration file |
| [`manage.py`](manage.py) | Project entry/configuration file |
| [`metadata.json`](metadata.json) | Project entry/configuration file |
| [`package.json`](package.json) | Project entry/configuration file |
| [`tsconfig.json`](tsconfig.json) | Project entry/configuration file |
| [`wrangler.toml`](wrangler.toml) | Project entry/configuration file |

## Commands and checks

```bash
npm run dev
npm run build
npm run preview
npm run start
```

These commands are declared in package.json; the list is not a test execution report. Test commands may need a browser, service or prepared database.

## Deployment

Deploy the build according to its architecture: server-backed projects need a Node process; static Vite frontends can host dist. Pages functions, KV or D1 require separate configuration.

## Limitations

The bundled npm `api` script contains development-only database connection settings; replace them for your environment. The frontend alone does not validate or deploy every backend variant.

## Troubleshooting

- Missing packages: install dependencies using the project’s package manager.
- API/network failure: check the configured origin, provider and hosting bindings.
- Old assets: rebuild when a build script exists, then clear the browser cache.

## Contributing

Create a focused branch, verify the affected behavior and explain the change clearly. Keep private data, build outputs and local databases out of commits.

## License

No repository-level license file is included in this snapshot. Public visibility alone does not grant reuse rights; contact the repository owner for terms.

---

Part of **PIMX** · Documentation in English and Persian.
