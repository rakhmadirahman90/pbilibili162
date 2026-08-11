# Identity Storage Hardening

The public registration flow accepts sensitive identity images (KK/AKTE/KIA). These files must not remain in a public Supabase Storage bucket in production.

## Required production configuration

1. Change `identitas-atlet` to a **private** bucket.
2. Allow public intake only for `INSERT` to `storage.objects` under `bucket_id = 'identitas-atlet'` and folder `identitas`.
3. Allow `SELECT`, `UPDATE`, and `DELETE` only to the authenticated administrative role used by the Authority Panel.
4. Do not use `getPublicUrl()` for identity files after the bucket becomes private.
5. Store the object path in `pendaftaran.foto_url`, then generate short-lived signed URLs for authenticated admin previews/downloads.
6. Audit RLS on every exposed public table. Public users should only have the minimum `SELECT`/`INSERT` access required by the site; admin mutations must not be authorized merely because a request reaches `/admin`.
7. Add rate limiting/Turnstile to public registration and comments before opening the endpoint broadly.

The codebase currently keeps the legacy public image URL behavior for backward compatibility with the existing admin image preview. The live Supabase project could not be queried from the connected tool in this session because the SQL operation returned a permissions error. Therefore this hardening document is intentionally **not** an auto-applied migration that could accidentally lock out the existing admin workflow.

Supabase recommends private buckets for sensitive documents and signed URLs for time-limited access. See the official Storage access-control documentation before applying the production policy changes.
