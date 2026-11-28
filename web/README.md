# VibeLeads web app

This is the Next.js application behind the hosted VibeLeads workspace. It includes the app and API routes, UI components, Supabase migrations, billing integrations, account-scoped search and enrichment services, and the client for the hosted Apify Actor.

## Local setup

Use Node.js 22 and pnpm 10.33.3. From this directory run the following commands.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`. The landing page and demo are available locally. Configure your own Supabase project and apply `supabase/migrations/` in order for authenticated features. Outside the demo, search, billing, email and background work need the relevant provider accounts and server-side credentials listed in `.env.example`. For Apify workspace sign-in, set `APIFY_OAUTH_ORIGIN` to your own registered HTTPS origin and configure the OAuth callback for that origin. The public installation uses https://www.vibeleads.app and https://www.vibeleads.app/auth/apify/callback. During a deployment-domain migration, update the registered callback and APIFY_OAUTH_ORIGIN together. Existing sessions on the old domain require a fresh sign-in.

Run `pnpm exec tsx --test tests/*.test.ts`, `pnpm typecheck` and `pnpm build` from this directory. The production smoke script can exercise six local routes after a build. It needs the documented build-time environment variables. The connector can be used independently of the web app. [Connection and plugin installation](../README.md)

The public workspace supports message drafting, saved leads and the connected Apify tools. Bulk website form submission uses a separate private service in the hosted product. The self-hosted app can read historical campaign receipts and does not launch that service.
