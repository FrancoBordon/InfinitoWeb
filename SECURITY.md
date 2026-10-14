# Security configuration and admin password migration

## Required deployment configuration

- `SESSION_SECRET`: a cryptographically random secret of at least 32 bytes. Rotating it invalidates all active admin sessions.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`: production login throttling uses Upstash Redis; production login fails closed with `503` if these are missing or unavailable. Local development uses an in-process limiter only.
- `APP_ORIGIN`: recommended canonical storefront origin (for example, `https://infinito-web.vercel.app`) for checking browser request origins. The request's own origin is also accepted for local development and configured Vercel hostnames.
- `SUPABASE_SERVICE_ROLE_KEY`: required only by the server-side image upload endpoint. Keep it server-only, set it in Vercel Production (and Preview only if needed), and never use a `NEXT_PUBLIC_` name.
- `STOCK_RESERVATIONS_ENABLED`: optional server-only recovery switch. Unset or any value other than the exact lowercase string `false` keeps reservations enabled. Set to `false` to stop creating new timed reservations; existing records and schema are preserved.

Never expose these values with a `NEXT_PUBLIC_` prefix. Configure them in the hosting provider's environment settings, not in source control.

## Vercel pre-deployment checklist

- [ ] Set `SESSION_SECRET` for Production and Preview to a different randomly generated value (at least 32 bytes). Generate locally with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"` and add it through Vercel Project Settings → Environment Variables; do not paste it into chat or commit it.
- [ ] Create an Upstash Redis database and set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from its REST API credentials for the Vercel environments that will accept admin logins. Keep the token server-only. Verify the `/api/auth` endpoint returns `503` when rate-limit credentials are absent or Redis is unavailable, and succeeds after the service is configured.
- [ ] Set `APP_ORIGIN` to the exact production storefront origin (for example, `https://infinito-web.vercel.app`). Set the matching origin for Preview if Preview deployments are expected to accept browser writes.
- [ ] Preserve and verify the existing database variables `DATABASE_URL` and `DIRECT_URL` in Vercel. Do not replace them with test values.
- [ ] Preserve and verify `NEXT_PUBLIC_SUPABASE_URL` for the Supabase project. `NEXT_PUBLIC_SUPABASE_ANON_KEY` is no longer needed by the upload flow and may remain configured, but it is not an administrator credential.
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` as a Vercel server-only secret for the image upload route. Never expose it to browser code, logs, build output, or a `NEXT_PUBLIC_` variable.
- [ ] In Supabase Storage, verify that the existing `productos` bucket is public for reads so existing and newly uploaded image URLs work. Remove or avoid anonymous `INSERT`, `UPDATE`, and `DELETE` policies; the application server uploads with the service-role key and `upsert: false`. Review policies in the Supabase dashboard or SQL editor, but do not change production policies automatically.
- [ ] Product and category uploads use only the existing `productos` bucket, under `products/` and `categories/` prefixes. The route streams and caps the complete HTTP body at 4.25 MB before multipart parsing, including when `Content-Length` is absent; image content is capped at 4.15 MB total and 4 MiB per file, with at most five files. Existing image URLs are unchanged. If a later file in a batch fails, the route removes only earlier objects whose creation succeeded in that request; cleanup failures are logged for operator follow-up.
- [ ] Uploads use random object names and `upsert: false`; the route never accepts a bucket or object path from the client. Category uploads allow one file, while product uploads allow up to five. The rate limit is 20 upload requests per administrator per 15-minute window.
- [ ] Confirm the `VERCEL_URL` system environment variable is enabled if Vercel preview/deployment hosts should be accepted as request origins.
- [ ] Confirm an admin can sign in once after rollout. Successful sign-in migrates that account's legacy hash to scrypt without returning the password or hash to the browser.
- [ ] Check `/api/seed` and `/api/migrate` return `410 Gone`; do not invoke maintenance scripts against production.

## Admin password migration

No administrator record is deleted, reset, or changed by deployment. On a successful login, the server recognizes the supported legacy salted DJB2 formats and immediately replaces that password value with a random-salt scrypt hash. Passwords already stored as scrypt are verified without modification. New password hashes use scrypt; the legacy format is verification-only and is never generated.

The migration is opportunistic because existing password hashes cannot be converted without the administrator's plaintext password. Each admin account upgrades on its next successful login. Do not re-enable the former seed endpoint to recover access: it contains sample data and destructive database operations. Any account-recovery procedure must be performed by an authorized operator through a separate, reviewed process.

Admin sessions are HMAC-SHA256-signed, stored in an HttpOnly cookie, and expire after eight hours. Login attempts are limited to five per email and source address per 15-minute window.

### Controlled deployment and rollback checklist

- [ ] Before rollout, record the currently deployed Vercel deployment URL, source commit, and environment variable configuration. Keep a known-good build artifact; do not rely on a database restore as an application rollback.
- [ ] Use a Vercel deployment built from this security branch/revision or a later reviewed commit that retains the security properties below. Promote/deploy that artifact explicitly; never roll back to the original `main` build.
- [ ] After rollout, verify admin login, catalog reads, product/category image upload and public image reads, order creation, stock reservation, and administrative confirmation/cancellation before considering the rollout complete.
- [ ] A successful admin login upgrades a legacy DJB2 hash in place to scrypt. Any recovery artifact must verify both supported legacy hashes and `scrypt$...`; the original/main authentication implementation does not verify scrypt and is not a safe rollback target.
- [ ] If reservation behavior must be paused, set `STOCK_RESERVATIONS_ENABLED=false` in Vercel Production and redeploy/restart the application. This only stops new timed holds; order prices remain database-calculated, current stock and existing active reservations are checked at checkout, and admin confirmation rechecks and decrements physical stock transactionally. Because new pending orders are not held, staff must expect that stock could be claimed by another order before confirmation. Existing reservation timestamps are not erased, and the column/index remain required by this version.
- [ ] Restore reservation behavior by removing the variable or setting it to `true`, then redeploy. Do not run schema commands to toggle the flag.
- [ ] For an application rollback, in Vercel select/promote only a deployment whose source was verified to include scrypt verification, server-authorized image uploads and server-side price calculation. If no such known-good deployment exists, deploy a reviewed forward-fix commit from this branch instead of reverting to an insecure artifact.
- [ ] Never restore an old database snapshot just to roll back application code; that could discard orders, products, or administrator password upgrades. Do not roll back the nullable stock column or its index.
- [ ] After rollback or forward fix, verify login using an already-scrypt-hashed test account and a legacy test account in an isolated environment before declaring recovery complete. Do not change the real administrator password/hash for testing.

Product deletion in the admin API is a soft delete (`active = false`) so existing product and order history remain intact.

## WhatsApp order stock reservations

Public WhatsApp checkouts place an atomic, 30-minute reservation without changing the physical `Product.stock` value. Active pending orders count against availability. An administrator can confirm an order only when its reserved units are still available; confirmation decrements physical stock once and clears the reservation. Cancelling a pending order releases its reservation without changing physical stock. Expired reservations no longer count toward availability; an expired order can only be confirmed if stock is still available at that time. Orders must be confirmed before shipping, and cancelling a confirmed order does not automatically replenish stock.

Setting `STOCK_RESERVATIONS_ENABLED=false` stops creating new reservation timestamps, but preserves checks against existing active reservations and physical stock at order creation. Confirmation continues to lock product rows, check physical availability against other active holds, and decrement stock once. Orders created while the switch is off can compete for the same unreserved stock; availability is rechecked at admin confirmation, which can reject an order if another confirmation consumed the units first. Prices continue to be computed from current database values; client-submitted totals are not accepted.

The original repository includes both `db:push` (`prisma db push`) and `db:migrate` (`prisma migrate dev`) scripts. The absence of `public._prisma_migrations` in production means Prisma Migrate history was not established there; this is consistent with `db push` or manually managed SQL, but the repository alone cannot prove which command was historically used. The nullable `Order.stockReservedUntil` column and `Order_status_stockReservedUntil_idx` index have since been applied manually to production and verified there. Do not run the old `prisma/migrations/20261013214100_add_stock_reservation_expiration/migration.sql` against production: without a baseline, Prisma would treat it as pending and attempt to create objects that already exist.

Admin stock edits are rejected if they would set physical stock below active reservations. Public order creation and image uploads also use the configured distributed Upstash limiter and fail closed if it is unavailable in production.

## Prisma schema and migration-history management

The Prisma schema is the application's intended model, not proof that every existing database has an identical physical schema. The production database has no `public._prisma_migrations` table, so Prisma Migrate has not been established as its migration-history system. `db:push` synchronizes a schema without recording migration history; `db:migrate` invokes `prisma migrate dev` and can create/apply migration history when someone explicitly runs it. Neither script is invoked by the build hooks.

The Vercel build script is `prisma generate && next build`; the package `postinstall` script is also only `prisma generate`. There is no `prisma migrate deploy`, `db push`, or reset in those build hooks. Do not add database-changing commands to build or install hooks.

Before adopting Prisma Migrate for production:

1. Take and verify a restorable database backup. Inspect the live schema read-only and compare all Prisma-managed tables, columns, types, defaults, indexes, constraints, and relations with `prisma/schema.prisma`. Also identify database objects Prisma does not model (for example, triggers, views, policies, or extensions) so the baseline does not accidentally become an incomplete inventory.
2. Make a reviewed baseline migration representing the **actual current production schema**, including `Order.stockReservedUntil` and `Order_status_stockReservedUntil_idx`. It must not be only the stock-column migration. A generated baseline can be prepared with `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`, but review it against the read-only inspection before accepting it; generated SQL is not proof of a schema match.
3. Incorporate the already-applied stock change into that baseline. Remove `20261013214100_add_stock_reservation_expiration` from the active migration sequence (or otherwise ensure it cannot be treated as a pending migration); do not keep it after a baseline that already creates the same column and index.
4. In a separately approved maintenance operation, record the baseline as already applied with `prisma migrate resolve --applied <baseline-name>` using the verified production connection. `migrate resolve` records migration history; it does not execute the baseline SQL. Do not run it until the backup, schema comparison, exact connection target, and baseline contents have been reviewed.
5. Test this exact baseline and subsequent migrations on an isolated database first. For any non-production database with a different starting schema, inspect and reconcile it independently rather than assuming it matches production.
6. After adoption, create future changes as reviewed migration files, test them against an isolated database, and apply them through an explicit release/operations step. Keep `prisma/schema.prisma` updated with each migration. Use `prisma migrate diff` for read-only comparison when checking schema drift; never use `db push` as the production migration process.

Until the baseline is reviewed and approved, do not run `prisma migrate deploy`, `prisma migrate dev`, `prisma db push`, or `prisma migrate reset` against production. This repository change does not connect to or modify Supabase.

## Dependency audit follow-up

The compatible `npm audit fix` updates the Next.js and Prisma 6 patch releases and `js-yaml` is pinned to a patched 4.x release. Unused direct dependencies `@mdxeditor/editor`, `next-auth`, `react-syntax-highlighter`, and `sharp` were removed after confirming they are not imported by the application.

The remaining `npm audit` report contains eight high-severity entries: five belong to the Next ESLint configuration/tool chain (`eslint-config-next`, `@next/eslint-plugin-next`, `fast-glob`, `micromatch`, and `braces`) and affect development lint tooling, not deployed route execution. The remaining three entries are the Prisma CLI chain (`prisma` → `@prisma/config` → `deepmerge-ts`), used for client generation/build scripts; the vulnerable merge utility is not part of the generated Prisma Client runtime. `npm audit --omit=dev` still reports these three because the Prisma CLI is declared in `dependencies` for build/postinstall generation. The reported fixes require downgrading the Next ESLint config to v14 or upgrading Prisma/deepmerge-ts across a major compatibility boundary, so those changes were not forced. Revisit these advisories when compatible upstream patches are available.

## Disabled maintenance endpoints

`/api/seed` and `/api/migrate` return `410 Gone` for all supported HTTP methods. Their destructive database operations have been removed from the deployed route handlers. No database migration, seed, reset, or production database operation is performed by these security changes.
