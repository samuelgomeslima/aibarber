# Secure OpenAI Backend Deployment Guide

This guide explains how to operate the new backend-only OpenAI integration, configure GitHub safely, and prepare Azure Static Web Apps (SWA) without using billed App Service or Container Apps resources.

## 1. Architecture Overview

- All OpenAI requests now flow through the `/api/openai-chat` and `/api/openai-transcribe` Azure Functions that live alongside the SWA site (`api/` directory).
- API keys and other secrets are never bundled into the client; they are read only by the functions at runtime.
- Authentication relies on Azure Static Web Apps built-in identity. Each request checks the `x-ms-client-principal` header.
- Quotas are enforced per user by storing counters in Supabase (table `api_usage`). Daily limits can be tuned with environment variables.
- Clients receive only minimal information (`choices`, `usage`, `quota` for chat and `{ text }` for transcription). Raw OpenAI payloads are never returned to the browser.

## 2. GitHub configuration

1. **Clean up old secrets**
   - In the repository, open **Settings → Secrets and variables → Actions** and delete `EXPO_PUBLIC_OPENAI_API_KEY`. The key no longer belongs in client builds.

2. **Add required secrets**
   - Still under **Secrets**, add or update the following entries so workflow runs and documentation stay in sync:
     - `OPENAI_API_KEY` – production key (used only for reference/backups; the deployment pulls it from Azure).
     - `SUPABASE_URL` – project URL used by the quota store.
     - `SUPABASE_SERVICE_ROLE_KEY` – service role key with insert/update privileges.
     - `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` – already required for the app shell.
     - Keep `AZURE_STATIC_WEB_APPS_API_TOKEN_*` secret supplied by Azure.

   > Tip: group these secrets inside a GitHub **Environment** (e.g., `production`) so you can require reviewers before deployments.

3. **Audit repository history**
   - Rotate any previously exposed OpenAI keys.
   - Create a pull request to remove local `.env` files that might contain secrets (never commit them).

4. **Workflow verification**
   - The workflow now deploys the API (`api_location: "api"`) and no longer injects the OpenAI key into the client bundle. Verify that the latest `Azure/static-web-apps` run completes successfully after secrets are updated.

## 3. Azure Static Web Apps configuration (free plan)

All steps below work on the free SWA plan—you do **not** need App Service or Container Apps.

1. **Deploy the updated repo**
   - Push to `main`. The GitHub Action publishes the web app and the new Azure Functions under the same SWA instance.

2. **Configure application settings**
   - In the Azure Portal open your Static Web App → **Configuration → Application settings** and add the following keys (Functions scope):
     | Name | Value | Notes |
     | --- | --- | --- |
     | `OPENAI_API_KEY` | Your production key | Required |
     | `SUPABASE_URL` | e.g. `https://xyz.supabase.co` | Required |
     | `SUPABASE_SERVICE_ROLE_KEY` | Service role token | Required |
     | `API_DAILY_REQUEST_LIMIT` | e.g. `100` | Optional override |
     | `API_CHAT_COST` | defaults to `1` | Optional per-request weight |
     | `API_TRANSCRIPTION_COST` | defaults to `3` | Optional per-request weight |
     | `OPENAI_CHAT_MODEL` | (optional) override model | Optional |
     | `OPENAI_TRANSCRIPTION_MODEL` | (optional) override | Optional |

   - Save and restart the app so Functions receive the new values.

3. **Enable authentication**
   - Navigate to **Authentication** inside your SWA and enable at least one identity provider (GitHub, Microsoft, etc.).
   - Set the login behaviour to “Login with provider” and block anonymous traffic to `/api/*`. The Azure portal offers “Allow unauthenticated traffic” toggle—set it to **Off** for the API.
   - Update your app’s navigation to expose the SWA login flow (e.g., `/login` or the default `.auth/login/<provider>` URL).

4. **Provision the Supabase quota table**
   - Run the SQL below in the Supabase SQL editor (or via `psql`). It creates the storage table and helper RPC referenced by the Functions:

     ```sql
     create table if not exists public.api_usage (
       id uuid primary key default gen_random_uuid(),
       user_id text not null,
       period_start date not null,
       request_count integer not null default 0,
       last_request_at timestamptz not null default now(),
       inserted_at timestamptz not null default now(),
       unique (user_id, period_start)
     );

     create or replace function public.create_api_usage_table_if_needed()
     returns void
     language plpgsql
     security definer
     as $$
     begin
       create table if not exists public.api_usage (
         id uuid primary key default gen_random_uuid(),
         user_id text not null,
         period_start date not null,
         request_count integer not null default 0,
         last_request_at timestamptz not null default now(),
         inserted_at timestamptz not null default now(),
         unique (user_id, period_start)
       );
     end;
     $$;

     grant usage on schema public to service_role;
     grant all on public.api_usage to service_role;
     grant execute on function public.create_api_usage_table_if_needed() to service_role;
     ```

   - The helper function lets the API verify the table exists without failing if the RPC is absent.

5. **Local development (no paid Azure resources)**
   - Install the [SWA CLI](https://azure.github.io/static-web-apps-cli/docs/use/install/) locally.
   - Run the Supabase database locally or point to your hosted instance.
   - Start the stack:
     ```bash
     swa start http://localhost:8081 --api-location api --run "npm run web"
     ```
     - The CLI proxies `/api/*` requests to the Azure Functions runtime and injects the simulated auth header when you run `swa login`.
     - For authenticated testing, run `swa login github` (or the provider you enabled) which supplies the `x-ms-client-principal` header to the backend.

6. **Quota adjustments**
   - To change daily allowance without redeploying, edit `API_DAILY_REQUEST_LIMIT` in SWA Configuration and click “Save”. Requests will start using the new limit immediately after Functions restart.

## 4. Operational checklist

- [ ] Rotate OpenAI credentials and confirm they are only stored in Azure Function app settings.
- [ ] Verify unauthenticated requests to `/api/openai-chat` return HTTP 401 from production.
- [ ] Confirm quota enforcement by triggering more than the configured limit and observing HTTP 429 responses.
- [ ] Monitor the Supabase `api_usage` table for growth; add retention policies if needed.
- [ ] Keep GitHub branch protections enabled so only reviewed PRs can modify backend logic.

Following these steps keeps the OpenAI key off the client, requires users to authenticate, and respects Azure’s free-tier limitations.
