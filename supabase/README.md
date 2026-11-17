# Supabase setup — Crafthand Market

## 1. Create a Supabase project

1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard) and create a project.
2. Wait until the database is ready.

## 2. Copy API keys into `.env.local`

From **Project Settings → API**:

| Env var | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_…`) from Connect / API Keys |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret / `service_role` key (keep secret) |

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is still accepted as a legacy alias for the publishable key.

Copy `.env.example` values into `.env.local` and replace the placeholders:

```bash
cp .env.example .env.local
# edit .env.local with your real keys
```

Optional: set Prisma `DATABASE_URL` / `DIRECT_URL` to the same Supabase Postgres
strings from **Project Settings → Database** so staff RBAC and marketplace data
share one database.

Restart the Next.js dev server after changing env vars.

## 3. Run the marketplace SQL migration

1. In the Supabase dashboard open **SQL → New query**.
2. Paste the full contents of:

   `supabase/migrations/20261117_marketplace_schema.sql`

3. Click **Run**.
4. Confirm tables exist under **Table Editor**:
   - `profiles`
   - `artisans`
   - `products`
   - `orders`
   - `order_items`

The script is idempotent where possible (`IF NOT EXISTS`, `OR REPLACE`).

## 4. Enable Auth providers

1. Open **Authentication → Providers**.
2. Keep **Email** enabled for password sign-up (`/auth/sign-up`, `/auth/login`).
3. (Optional) Add Google/GitHub OAuth and set the redirect URL to:

   `https://YOUR_DOMAIN/auth/callback`

## 5. What the app wires up

| Path | Purpose |
| --- | --- |
| `utils/supabase/client.ts` | Browser client (`@supabase/ssr`) |
| `utils/supabase/server.ts` | Server Components / Route Handlers |
| `utils/supabase/middleware.ts` | Session refresh helper |
| `utils/supabase/admin.ts` | Service-role client (server only) |
| `middleware.ts` | Refresh cookies + protect `/store`, `/artisan`, `/orders`, `/cart` when Supabase is configured; keeps existing `/admin` cookie RBAC |
| `/auth/login`, `/auth/sign-up` | Email/password Auth UI |
| `/auth/callback` | OAuth / email confirm exchange |

Until Supabase keys are set, protected-route redirects are skipped so local
workshop flows (localStorage) keep working.
