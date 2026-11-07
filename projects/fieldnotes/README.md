# Fieldnotes

A no-account research workspace for graduate students: literature, project questions, notes, milestones, and personal activity analytics. Initial scaffolding was built with AI assistance for Debanhi Rojas Figueroa’s product analytics learning project.

## Use the app

Open the published app and start working. No ChatGPT account, email address, or login is required. Each browser keeps its own workspace using localStorage. Projects, notes, and recorded actions are not sent to an application database or third-party analytics service. The hosting provider still handles ordinary website requests.

Work does not automatically sync between browsers or devices. Clearing browser data removes saved work; private browsing may discard it when the window closes. Use **Build journal → Export full backup** regularly. **Import backup** lets you review and replace the current workspace with a JSON backup, including notes and event history. CSV exports are available for literature and activity analysis.

The initial projects, statuses, notes, and milestones are clearly labeled sample content. Replace them with your own work. A new browser starts with a separate sample workspace, not another visitor’s records.

## Features

- Add, edit, and delete projects, literature sources, and milestones.
- Save authors, year, source type, source/PDF links, topics, planned use, notes, reading status, and notes completion.
- Search literature and filter by project or reading status.
- Track milestone completion and project progress.
- Persist browser data with validation and stale-tab checks.
- Export full JSON backups and restore them after review.
- Export literature and local event CSVs; examine descriptive usage patterns.
- Recover a raw backup if stored data cannot be parsed, rather than silently overwriting it.

The activity log retains at most 5,000 events. It describes this browser’s usage, not unique people, population retention, or a randomized experiment. No measured business impact is claimed.

## Stack

React, TypeScript, Vinext/Vite, and Zod validation, hosted on Cloudflare Workers through Sites. This version uses browser persistence and has no application API routes or authentication dependency. Historical database schema/migrations from the first private prototype are retained unchanged for deployment history; the current UI does not use them.

The app lives in `projects/fieldnotes` in the GitHub portfolio repository. Existing personal website pages are unchanged. The live app is deployed separately from the Jekyll website. Express, PostgreSQL, Google SSO, collaboration, automatic cloud synchronization, and file uploads are not implemented.

## Run locally

Requires Node.js 22.13 or newer. Run commands from the project folder:

```sh
npm ci
npm run dev
```

For a production build and automated checks:

```sh
npm run typecheck
npm test
npm run build
```

Deployment uses the Sites workflow and the existing `.openai/hosting.json` identity. Do not publish credentials or replace the project ID with a guessed value. No additional service accounts or API keys are required to use the app.

## Your first analytics exercise

1. Create one research project and add five sources.
2. Write notes for two sources and finish one milestone.
3. Export event and literature CSVs.
4. Use `analytics/queries.sql` to count actions by day and feature.
5. Run `Rscript analytics/analyze_events.R /path/to/fieldnotes-events.csv`.
6. Write a one-page memo: question, metric, result, limitation, next decision.

The R script uses base R and creates a feature-usage chart beside the CSV. The dashboard uses local dates; the SQL and R examples use UTC. Importing someone else’s backup or sharing a browser mixes usage histories, so document your data source.

### Use SQL on the exports

With the SQLite CLI, import CSV headers as column names into a new scratch database:

```text
sqlite3 fieldnotes-analysis.db
.mode csv
.import /path/to/fieldnotes-events.csv events
.import /path/to/fieldnotes-sources.csv sources
.read analytics/queries.sql
```

`analytics/study_design.sql` is a separately labeled future multiuser study example. It assumes a consented dataset with user IDs; the current no-account app does not collect or provide those IDs. Its automated test demonstrates complete observation windows and correct cohort denominators, not actual retention results.

## Next improvements to build yourself

- Improve one source-form interaction based on your experience.
- Add sorting and test the empty-state behavior.
- Distinguish form starts, abandonments, and successful submissions without storing sensitive note text in event logs.
- Design an experiment, then analyze separately labeled simulated data.
- Consider optional independent authentication and cloud sync only if users need them.

Explain your own contributions in interviews. The initial scaffold is AI-assisted; your subsequent analysis, product decisions, testing, and improvements are the work to demonstrate.
