# PlantKeeper Copilot Instructions

## Project Overview

Fullstack plant management SPA. **Nuxt 3** (`ssr: false`) + **Vuetify 3** frontend, **Nitro API** backend, **SQLite** (better-sqlite3, synchronous) database. TypeScript strict mode — no `any` types.

## Architecture

- `pages/` auto-routed by Nuxt · `server/api/` file-based endpoints (filename encodes HTTP method, e.g. `index.post.ts`)
- Auth: HTTP-only session cookie `plantkeeper_session` backed by `sessions` DB table (7-day expiry)
- User isolation: every protected handler calls `requireAuth(db, event)` from `server/utils/session.ts`, which throws 401 or returns the authenticated user; **always set `body.user_id = user.id`** — never trust client-supplied user_id

## Critical Patterns

**SQLite booleans** — stored as 0/1 integers; never store raw JS booleans.

- DB→App: `plantTableRowToPlant()` in `server/utils/db.ts`
- App→DB: `mapPlantBodyToDbFields()` in `server/utils/db.ts`

**Field naming** — snake_case in DB, camelCase in API responses via `toCamelCase()` in `server/utils/db.ts`

**Null/undefined bridging** — `nullToUndefined()` converts DB nulls for frontend; `undefinedToNull()` converts back for DB storage

**Multi-step plant creation** (handled in `composables/useFormPlant.ts`):

1. POST `/api/plants` → 2. POST `/api/personal` (if `is_personal`) → 3. POST `/api/plant_photos` per image

**DB transactions** — wrap multi-statement writes:

```ts
db.exec('BEGIN TRANSACTION');
// ...statements...
db.exec('COMMIT');
// catch: db.exec('ROLLBACK')
```

**DB migrations** — custom system tracked in `migrations` table; scripts in `server/scripts/`. Run with `npm run db-migrate`.

## Vue Conventions

- Always `<script setup lang="ts">` — Options API is not used
- Extract reusable logic into `composables/` with `use` prefix (`useAuth`, `useFormPlant`)
- Minimal state in `ref`/`reactive`; derive values with `computed`
- Route protection: add `definePageMeta({ middleware: 'auth' })` to protected pages

## API Endpoint Conventions

```ts
export default defineEventHandler(async (event) => {
  const db = useDatabase();
  const user = await requireAuth(db, event); // throws 401 if unauthenticated
  const body = await readBody(event);
  body.user_id = user.id; // always override from session
  // validate → query → return camelCase response
});
```

Throw errors with `createError({ statusCode, statusMessage })`. Use `db.prepare().run()` with prepared statements for all queries.

## Dev Workflows

```bash
npm run dev              # Dev server (localhost:3000)
npm run typecheck        # Vue TSC type check — run before committing
npm run lint:fix         # ESLint autofix
npm run format           # Prettier format
npm run test             # Vitest (auto uses in-memory DB)
npm run db-migrate       # Apply pending migrations
npm run db-migrate:down  # Rollback last migration
npm run db-backup        # Backup SQLite (.data/plant-keeper.db)
npm run db-deploy        # Reset DB to initial state
npm run build            # Production build → .dist/
```

## Testing

In-memory DB auto-activated when `NODE_ENV=test` or `VITEST=true`. Use helpers from `test/setup.ts`:

```ts
const db = useDBTestUtils(); // seeded in-memory DB instance
const event = createMockH3Event({ body, query }); // mock H3 event for endpoint tests
```

Test files live in `__tests__/` folders adjacent to the modules they test.

## Vuetify Patterns

**Form validation** — `ref="form"` on `<v-form>`; rules as validator arrays:

```ts
const rules = [(v: string) => !!v || 'Required'];
```

Expose `form.value?.validate()` from child components via `defineExpose`. Submit buttons use `:loading="isLoading"`, not `:disabled`.

**Grid** — always specify `cols` + `md` at minimum: `cols="12" sm="6" md="4"`

**Loading state** — `<v-card class="text-center pa-5"><v-progress-circular indeterminate /></v-card>`

**Alerts** — always `variant="tonal"`: `<v-alert type="error" variant="tonal" density="compact">`

**Dialogs** — `v-model` on dialog + `#activator="{ props: activatorProps }"` slot on trigger + `v-bind="activatorProps"`

## Environment

- `WEATHER_API_KEY` — **required** for weather features (OpenWeatherMap)
- `DATABASE_DIR` / `DATABASE_NAME` — optional overrides for SQLite path (defaults to `.data/plant-keeper.db`)

## Additional References

Detailed skill guides in `.github/skills/`: `vue-best-practices`, `vue-testing-best-practices`, `vue-pinia-best-practices`, `vue-router-best-practices`, `create-adaptable-composable`, `vue-debug-guides`

## Key Files

| Area                            | File                                        |
| ------------------------------- | ------------------------------------------- |
| DB schema & initialization      | `server/utils/db_build.ts`                  |
| DB helpers + type conversion    | `server/utils/db.ts`                        |
| Session auth + `requireAuth`    | `server/utils/session.ts`                   |
| TypeScript interfaces           | `types/database.ts`                         |
| Auth composable                 | `composables/useAuth.ts`                    |
| Plant form + photo upload logic | `composables/useFormPlant.ts`               |
| Route guards                    | `middleware/auth.ts`, `middleware/guest.ts` |
| Security headers + Nuxt config  | `nuxt.config.ts`                            |
| Test utilities                  | `test/setup.ts`                             |
