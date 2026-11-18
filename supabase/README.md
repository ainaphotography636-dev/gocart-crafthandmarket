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

## 3. Run the marketplace SQL migrations

1. In the Supabase dashboard open **SQL → New query**.
2. Run these files in order:

   - `supabase/migrations/20261117_marketplace_schema.sql`
   - `supabase/migrations/20261117_client_role.sql` (adds `client` role; keeps legacy `buyer`)
   - `supabase/migrations/20261117_product_inr_specs.sql` (INR pricing + handicraft specs)
   - `supabase/migrations/20261118_staff_admin_profiles.sql` (staff admin_role / permissions / portfolio)

3. Confirm tables exist under **Table Editor**:
   - `profiles` (with `admin_role`, `permissions`, `is_founder`, `portfolio`)
   - `artisans`
   - `products`
   - `orders`
   - `order_items`

### Promote the founder Super Admin

After your founder account signs up, mark them as the locked Super Admin (exactly one):

```sql
update public.profiles
set
  role = 'admin',
  admin_role = 'SUPER_ADMIN',
  permissions = array['*'],
  is_founder = true,
  portfolio = coalesce(nullif(portfolio, ''), 'Founder Super Admin')
where email = 'YOUR_FOUNDER_EMAIL@example.com';
```

`/admin/staff` then lists Supabase staff profiles. Super Admin can **Add staff** (Auth invite), **Remove**, and **Edit profile** (name + portfolio).

### Connect the full demo directory (Jordan, Rahul, Meera, Sofia + founder)

On `/admin/staff`, click **Connect all to Supabase**. That creates (or reuses) Auth users for:

- `aina@crafthand.market` — Super Admin / founder  
- `jordan@crafthand.market` — Main Admin  
- `rahul@crafthand.market` — Operations  
- `meera@crafthand.market` — Artisan Lead  
- `sofia@crafthand.market` — B2B Trade  

Requires `SUPABASE_SERVICE_ROLE_KEY` and the staff profiles migration above.

The scripts are idempotent where possible (`IF NOT EXISTS`, `OR REPLACE`).

## 4. Enable Auth providers + email delivery

1. Open **Authentication → Providers**.
2. Keep **Email** enabled for password sign-up (`/auth/sign-up`, `/auth/login`, `/artisan/join`).
3. Open **Authentication → URL Configuration**:
   - **Site URL:** your live domain (e.g. `https://crafthandmarket.com`) or Vercel preview URL
   - **Redirect URLs:** include
     - `https://YOUR_DOMAIN/auth/callback`
     - `http://localhost:3000/auth/callback`
4. **Confirmation emails not arriving?** Supabase’s built-in SMTP is heavily rate-limited.
   - **Quick test:** Authentication → Providers → Email → turn **off** “Confirm email” so signup signs in immediately.
   - **Production:** Authentication → Emails → set **custom SMTP** (Resend / SendGrid / SES) and keep confirmations on.
5. Set `NEXT_PUBLIC_APP_URL` in Vercel / `.env.local` to the same public origin used above so signup emails redirect correctly.
6. (Optional) Add Google/GitHub OAuth with redirect:

   `https://YOUR_DOMAIN/auth/callback`

## 5. What the app wires up

These files match **Supabase Connect → Framework → Next.js → App Router**:

| Path | Purpose |
| --- | --- |
| `.env.local` | `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| `utils/supabase/client.ts` | Browser client (`@supabase/ssr`) |
| `utils/supabase/server.ts` | Server Components / Route Handlers |
| `utils/supabase/middleware.ts` | Session refresh helper (`createClient` + `updateSession`) |
| `utils/supabase/admin.ts` | Service-role client (server only) |
| `middleware.ts` | Refresh cookies; role-gate `/store` + `/artisan/*` (artisan); protect `/orders` (signed-in); keep `/cart` public |
| `/auth/login`, `/auth/sign-up` | Client (default) or artisan (`?intent=artisan`) auth |
| `/artisan/join`, `/artisan/login` | Partner / campaign artisan onboarding |
| `components/auth/*` | `AuthProvider`, cart-triggered `ClientAuthModal`, shared `RoleAuthForm` |
| `/auth/callback` | OAuth / email confirm exchange |
| `app/actions/marketplace-products.ts` | Ensure `artisans` row + insert `products` after R2 upload |
| `app/actions/auth-profile.ts` | Ensure `profiles.role` matches entry-point intent |
| `lib/marketplace/catalog.ts` | Server catalog reads (published products + verified artisans) |
| `/shop`, `/artisans`, `/shop/[username]`, `/product/[id]` | Public storefront powered by Supabase + R2 media URLs |

**Client flow:** browse freely → Add to Cart / Place Order opens client auth modal → role `client` → cart restored → continue to `/cart` or `/orders`.

**Artisan flow:** `/artisan/join` (or Navbar “Become an Artisan”) → role `artisan` → `/store` dashboard.

**Storefront visibility:** artisans need `verification_status = verified` and `is_active = true`; products need `is_published = true` and `in_stock = true`.

**Required follow-up migration:** run `20261117_product_inr_specs.sql` in the Supabase SQL editor if the shop shows `column products.weight does not exist` (or missing `price_inr` / `specs`). The app falls back to a compatible select/insert without those columns, but INR-specific fields will only persist after the migration.

Until Supabase keys are set, protected-route redirects are skipped so local
workshop flows (localStorage) keep working.

## 6. Optional: Supabase agent skills

```bash
npx skills add supabase/agent-skills
```

Installed under `.agents/skills/` (`supabase`, `supabase-postgres-best-practices`).
