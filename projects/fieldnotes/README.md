# Fieldnotes

A research workspace for graduate students to organize literature, connect sources to projects, write research notes, and track milestones. Built as a first product analytics portfolio project for Debanhi Rojas Figueroa, with AI-assisted scaffolding.

## Working features

- Create, edit, and delete projects, literature sources, and milestones.
- Save authors, year, source type, PDF or source URL, topics, planned use, reading status, research notes, and notes completion.
- Filter literature by project or reading status and search titles, authors, and topics.
- View project milestone progress and mark milestones complete or reopen them.
- Authenticated per-user cloud persistence, optimistic concurrency checks, and input validation.
- Record feature actions; explore daily activity and descriptive workspace metrics.
- Export literature and activity CSVs, plus a full workspace JSON backup.

Initial projects, source statuses, example notes, and milestone states are sample content. Book titles are bibliographic examples. No confidential research data is embedded. Anonymous previews are session-only and reset on reload; authenticated hosted workspaces use the database. JSON export is a backup only; import and file uploads are not implemented.

## Stack and boundaries

React, TypeScript, Vinext (Vite-based), Cloudflare Workers, Drizzle ORM, and Cloudflare D1 (SQLite). The hosted version uses platform-managed ChatGPT authentication. It does not use Express, PostgreSQL, or Google SSO. GitHub Pages serves the existing personal website; it cannot run this backend. Deploy this application separately.

Workspaces are stored as validated JSON snapshots with a version number. Events are separate relational records indexed by user and time. This keeps the first iteration manageable; normalizing projects, sources, and milestones into their own tables is a future engineering exercise. Saves succeed independently of optional activity logging, so analytics can undercount when logging fails. The dashboard loads the most recent 10,000 events per user.

## Run locally

Requires Node.js 22.13 or newer. Run commands from this project folder.

```sh
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_young_odin.sql
npm run dev
```

Run `npm run db:generate` only after changing `db/schema.ts`; initial migrations already exist. Local and hosted databases are separate. Do not reapply migrations to a database that already has them. Set the portable execution profile on your computer with `node scripts/configure-execution-profile.mjs`. In portable loopback development, `/signin-with-chatgpt?return_to=/` uses the starter’s mock identity, which is excluded from production. Managed preview without identity shows the session-only demo.

For hosted publishing, use the Sites workflow. The hosting manifest identifies the existing private deployment; preserve that ID. No secrets belong in the repository.

## Checks

```sh
npx tsc --noEmit
npm run build
node --experimental-strip-types --test tests/model.test.mjs
```

Optional integration check: `node tests/api-smoke.mjs http://127.0.0.1:4173`. It accepts only loopback URLs, sends synthetic local identities, and verifies persistence, conflict handling, validation, and user separation. It writes disposable QA records to your local database. Never run it against production.

## Learn product analytics

Use `analytics/queries.sql` for SQL examples and metric definitions. `analytics/analyze_events.R` creates a chart from an activity CSV using base R. Exports omit user identifiers because the current interface analyzes only the current user’s workspace.

Your first exercise:

1. Create a real project and add five sources.
2. Add notes to two sources and complete a milestone.
3. Export events from Analytics.
4. Run the R script and explain which features you used most.
5. Write a one-page memo: question, metric, result, limitation, next decision.

Activation and retention SQL examples require mature observations and an appropriate user sample. This initial private app cannot estimate population adoption, causal product effects, or an A/B test result. No measured impact is claimed. A later study needs consent, instrumented errors, entry-point events, and an experiment design before recruiting participants.

## Development roadmap

- Improve the source form based on your own usage.
- Normalize the database and add workspace backup import.
- Track form starts and validation errors without recording note text.
- Add source sorting and additional automated workflow tests.
- Design an experiment; simulate data separately and label it simulated.

Describe your actual contributions when presenting this project. This initial scaffold was built with AI assistance; the analysis, decisions, validation, and later improvements you personally make are the work to explain in interviews.
