# Security configuration and admin password migration

## Required deployment configuration

- `SESSION_SECRET`: a cryptographically random secret of at least 32 bytes. Rotating it invalidates all active admin sessions.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`: production login throttling uses Upstash Redis; production login fails closed with `503` if these are missing or unavailable. Local development uses an in-process limiter only.
- `APP_ORIGIN`: recommended canonical storefront origin (for example, `https://infinito-web.vercel.app`) for checking browser request origins. The request's own origin is also accepted for local development and configured Vercel hostnames.

Never expose these values with a `NEXT_PUBLIC_` prefix. Configure them in the hosting provider's environment settings, not in source control.

## Vercel pre-deployment checklist

- [ ] Set `SESSION_SECRET` for Production and Preview to a different randomly generated value (at least 32 bytes). Generate locally with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"` and add it through Vercel Project Settings → Environment Variables; do not paste it into chat or commit it.
- [ ] Create an Upstash Redis database and set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from its REST API credentials for the Vercel environments that will accept admin logins. Keep the token server-only. Verify the `/api/auth` endpoint returns `503` when rate-limit credentials are absent or Redis is unavailable, and succeeds after the service is configured.
- [ ] Set `APP_ORIGIN` to the exact production storefront origin (for example, `https://infinito-web.vercel.app`). Set the matching origin for Preview if Preview deployments are expected to accept browser writes.
- [ ] Preserve and verify the existing database variables `DATABASE_URL` and `DIRECT_URL` in Vercel. Do not replace them with test values.
- [ ] Preserve and verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for the existing image upload/storage integration. They are public Supabase project settings, not service-role credentials.
- [ ] Confirm the `VERCEL_URL` system environment variable is enabled if Vercel preview/deployment hosts should be accepted as request origins.
- [ ] Confirm an admin can sign in once after rollout. Successful sign-in migrates that account's legacy hash to scrypt without returning the password or hash to the browser.
- [ ] Check `/api/seed` and `/api/migrate` return `410 Gone`; do not invoke maintenance scripts against production.

## Admin password migration

No administrator record is deleted, reset, or changed by deployment. On a successful login, the server recognizes the supported legacy salted DJB2 formats and immediately replaces that password value with a random-salt scrypt hash. Passwords already stored as scrypt are verified without modification. New password hashes use scrypt; the legacy format is verification-only and is never generated.

The migration is opportunistic because existing password hashes cannot be converted without the administrator's plaintext password. Each admin account upgrades on its next successful login. Do not re-enable the former seed endpoint to recover access: it contains sample data and destructive database operations. Any account-recovery procedure must be performed by an authorized operator through a separate, reviewed process.

Admin sessions are HMAC-SHA256-signed, stored in an HttpOnly cookie, and expire after eight hours. Login attempts are limited to five per email and source address per 15-minute window.

Product deletion in the admin API is a soft delete (`active = false`) so existing product and order history remain intact.

## Dependency audit follow-up

The compatible `npm audit fix` updates the Next.js and Prisma 6 patch releases and `js-yaml` is pinned to a patched 4.x release. Unused direct dependencies `@mdxeditor/editor`, `next-auth`, `react-syntax-highlighter`, and `sharp` were removed after confirming they are not imported by the application.

The remaining `npm audit` report contains eight high-severity entries: five belong to the Next ESLint configuration/tool chain (`eslint-config-next`, `@next/eslint-plugin-next`, `fast-glob`, `micromatch`, and `braces`) and affect development lint tooling, not deployed route execution. The remaining three entries are the Prisma CLI chain (`prisma` → `@prisma/config` → `deepmerge-ts`), used for client generation/build scripts; the vulnerable merge utility is not part of the generated Prisma Client runtime. `npm audit --omit=dev` still reports these three because the Prisma CLI is declared in `dependencies` for build/postinstall generation. The reported fixes require downgrading the Next ESLint config to v14 or upgrading Prisma/deepmerge-ts across a major compatibility boundary, so those changes were not forced. Revisit these advisories when compatible upstream patches are available.

## Disabled maintenance endpoints

`/api/seed` and `/api/migrate` return `410 Gone` for all supported HTTP methods. Their destructive database operations have been removed from the deployed route handlers. No database migration, seed, reset, or production database operation is performed by these security changes.
