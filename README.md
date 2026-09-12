# Aster

A guided advertising workspace built with React, TypeScript, Vite, TanStack, Tailwind/shadcn, Recharts, and a Cloudflare Workers/D1/Drizzle backend.

## Run locally

```sh
npm install
npm run dev
```

Open the local Vite address. The welcome screen offers **Explore demo workspace**. Google/Facebook login and Meta authorization are intentionally unavailable in the local Vite preview; it never creates a fake authenticated session.

## Verify

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

## Workflows and configuration

- [UX and route map](docs/ux-workflow.md)
- [Google/Facebook account authentication](docs/authentication.md)
- [Meta Ads OAuth configuration](docs/meta-ads-oauth.md)

The frontend includes guided setup, campaign monitoring with coherent sample data, persistent demo conversations, draft review and local approval, recommendations, rule drafts, activity history, and optional creative-folder references.

The Worker implements configurable Google/Facebook identity login and separate Meta OAuth/account selection. Provider configuration, migration application, deployment and live-provider verification are still required. Live campaign synchronization, AI-model integration and campaign publishing are not implemented. No local approval publishes an ad or enables spend.

Never put provider secrets or Meta tokens in frontend variables or source control. The authentication documentation describes the server-only environment, trust boundaries and deployment checks.
