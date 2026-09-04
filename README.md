<p align="center"><img src="docs/logo.svg" alt="OpenBox Logo" width="200" height="60" /></p>`n`n# OpenBox

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md)

![License](https://img.shields.io/badge/license-Apache--2.0-blue)
![Resource patrol](https://github.com/Morningstar202604/OpenBox/actions/workflows/monitor.yml/badge.svg)
![React 19](https://img.shields.io/badge/React-19-61dafb)

**Free AI resources, checked daily, in one place.**

280+ curated listings across 11 categories: free model APIs, relay gateways, chat mirrors, free hosting and domains, AI apps, developer tools, study material. Every listing is kept honest by an automated link patrol plus community votes — when a free tier dies, you see it on the card, not after you signed up.

Live site: [openbox-nav.pages.dev](https://openbox-nav.pages.dev)

## Why this exists

Curated lists of free AI stuff go stale within weeks. Half the links 404, the other half quietly added a credit card requirement. OpenBox attacks that problem with three mechanisms:

1. **Automated patrol.** A scheduled job probes every link every day (HTTP check, DNS fallback, two-strike rule before anything is marked dead). Results feed the site itself.
2. **Community votes.** Each card has a "still works / dead" toggle with per-device dedup. Visitors keep the list current between patrols.
3. **Honest labeling.** Invite-only? Region-locked? Needs a proxy? Payment expected later? It says so on the card.

## What's inside

- **Categories:** free APIs, chat mirrors, relays, proxy nodes, free servers/VPS, free domains, AI apps, agents, open models, tools, learning resources, charity/community gateways, invite & activation codes
- **Scenario filters:** beginner, developer, researcher, creator, freshman starter kit
- Trilingual search (中文 / English / 日本語) across names, summaries, tags and supported models
- Grid / dense-list views, dark mode, mobile bottom-tab layout
- Optional Supabase backend for submissions, comments, ratings and cloud favorites; fully usable without any backend
- PWA: installable, offline-friendly after first visit

## Quick start

```bash
git clone https://github.com/Morningstar202604/OpenBox.git
cd OpenBox
npm install --legacy-peer-deps
npm run dev        # http://localhost:5173/OpenBox/
npm run build      # tsc + vite build + SPA path generation
```

## Deployment

Every option below costs nothing.

| Target | Guide |
|---|---|
| School / campus intranet (recommended) | [DEPLOY-SCHOOL.md](./DEPLOY-SCHOOL.md) |
| Public site reachable from mainland China | [EDGEONE_DEPLOY.md](./EDGEONE_DEPLOY.md) (Tencent EdgeOne Pages, free tier) |
| Experimental: GitCode Pages | [official docs](https://gitcode.com/cocoachina/pages/overview) |
| Overseas mirror | [CLOUDFLARE_DEPLOY.md](./CLOUDFLARE_DEPLOY.md) |

Pushes to `main` build automatically via GitHub Actions; the Cloudflare deploy step skips itself cleanly if no token is configured.

## Data quality

- `npm run audit:data` — seven automated content checks (self-contradictions, unqualified price claims, fake tags, stale numbers)
- `npm run monitor` — stateful daily patrol engine feeding `resource-status.json`
- Migrations `supabase/migrations/0001`–`0008` ship row-level security and IP-based rate limiting for anonymous writes

## Contributing

No code required: submit a resource, cast verification votes, comment with your experience, report dead links, improve translations. See [CONTRIBUTING.md](./CONTRIBUTING.md). Code contributions follow the standard fork-branch-PR flow.

If OpenBox saved you an afternoon of hunting dead links, a star helps other people find it. That is the whole ask.

## License

[Apache-2.0](./LICENSE) © Morningstar202604


