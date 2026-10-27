# Mujahid Electronic Goods POS

Offline-first storefront and shop POS for Mujahid Electronic Goods. The application supports
product catalog browsing, counter billing, stock management, Udhaar/Khata, repairs, expenses,
PDF receipts, WhatsApp sharing, optional email delivery, and optional Supabase synchronization.

## Local setup

```bash
npm install
copy .env.example .env.local
npm run dev
```

Set these values in `.env.local` before using the Admin POS:

```text
ADMIN_EMAIL=the-owner-email
ADMIN_PASSWORD=a-long-random-password
AUTH_SECRET=a-long-random-secret
```

The admin password and signing secret are server-only. Never prefix them with `NEXT_PUBLIC_`
and never commit `.env.local`.

Optional values:

- `GMAIL_USER` and `GMAIL_APP_PASSWORD` enable direct bill email.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` enable the existing cloud-sync adapter.

## Validation

```bash
npm run lint
npm test
npm run build
```

The app remains usable in local/offline mode without Supabase. IndexedDB is used for local
transactions and the browser backup screen can export the current shop data.

## Important production notes

- The admin session is an HttpOnly, signed cookie. Configure the required auth environment
  variables before deployment.
- Do not use the development database as the only copy of business records. Configure and test
  backups before handing the system to the shop.
- Cloud sync requires matching Supabase tables and policies. A failed sync is reported rather
  than silently marking records as synchronized.
- Tax is currently disabled. Invoice data is not a GST invoice unless tax configuration is
  deliberately added and verified for the business.
- See [DEPLOYMENT.md](./DEPLOYMENT.md) for Vercel, Supabase, environment variables, and
  production smoke-test steps.
