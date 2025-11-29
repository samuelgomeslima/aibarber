# AIBarber Deployment and Security Guide

This guide consolidates the project deployment steps, authentication settings, and security practices needed to operate the
AIBarber application.

## Repository Structure
```
/
├─ api/                # Azure Functions app (Node.js)
│  ├─ host.json
│  ├─ package.json
│  └─ .gitignore
├─ src/                # SWA front-end
└─ ...
```
Azure Static Web Apps automatically discovers the Azure Functions application because it resides in the `api/` folder.

## Local Development
1. Install the Azure Functions Core Tools and Node.js 18 or later.
2. From the repository root install dependencies:
   ```bash
   npm install
   (cd api && npm install)
   ```
3. Add an `api/local.settings.json` file (excluded from git) with your secrets:
   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "AzureWebJobsStorage": "UseDevelopmentStorage=true",
       "FUNCTIONS_WORKER_RUNTIME": "node",
       "OPENAI_API_KEY": "sk-your-key",
       "OPENAI_PROXY_TOKEN": "local-dev-token"
     }
   }
   ```
4. Run both the Expo web front-end and the Azure Functions backend locally using the SWA CLI or separate terminals:
   ```bash
   npm run web -- --port 5173  # front-end (Expo web dev server)
   npm run start --prefix api  # backend (func start)
   ```
   > Expo defaults to port 19006; passing `--port 5173` keeps the local server aligned with the SWA CLI example below.

## Secure Configuration and Secret Management
- Store `OPENAI_API_KEY` and `OPENAI_PROXY_TOKEN` as application settings in Azure Static Web Apps (SWA). Do **not** commit these values to the repository.
- The HTTP triggers require an `x-api-key` header that matches `OPENAI_PROXY_TOKEN` to protect chat and transcription proxies.
- Rotate secrets regularly and remove unused values from Azure.

### Configure Secrets in Azure Static Web Apps
1. In the Azure Portal, open your Static Web App.
2. Go to **Settings → Configuration → Application settings**.
3. Add the required settings and save:
   - `OPENAI_API_KEY` = `sk-...`
   - `OPENAI_PROXY_TOKEN` = random shared secret used by the client and proxies.
4. Trigger a redeploy from GitHub Actions or restart the Functions API so the new settings take effect.

### Sample Azure Function Proxy
```ts
// api/chat/index.ts
import type { Context, HttpRequest } from '@azure/functions';
import fetch from 'node-fetch';

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

export default async function handler(context: Context, req: HttpRequest) {
  const messages = req.body?.messages;

  if (!Array.isArray(messages)) {
    context.res = {
      status: 400,
      body: { error: 'Expected an array of chat messages.' },
    };
    return;
  }

  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    context.log.error('OpenAI request failed', errorBody);
    context.res = {
      status: response.status,
      body: { error: 'OpenAI request failed.' },
    };
    return;
  }

  const data = await response.json();

  context.res = {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: data,
  };
}
```

### Local Testing with the SWA CLI
1. Install the CLI: `npm install -g @azure/static-web-apps-cli`.
2. Create a `local.settings.json` inside the `api` folder:
   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "AzureWebJobsStorage": "UseDevelopmentStorage=true",
       "OPENAI_API_KEY": "sk-fake-local1234567890"
     }
   }
   ```
3. Run the app: `swa start http://localhost:5173 --api-location ./api`.
4. The frontend can now call `http://localhost:4280/api/chat` without exposing the key.

### Front-end Usage
```ts
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello!' }
    ],
  }),
});

if (!response.ok) {
  throw new Error('Chat request failed');
}

const data = await response.json();
console.log(data);
```
Because the browser calls the SWA endpoint, the OpenAI API key remains in the server environment.

### Route Restrictions
The deployed configuration already requires authentication for `/api/chat` via `staticwebapp.config.json`:
```json
{
  "routes": [
    {
      "route": "/api/chat",
      "allowedRoles": ["authenticated"]
    }
  ]
}
```
Requests must include:
- A valid SWA authentication token issued by your identity provider (for example, GitHub or Azure AD) so that the caller is in the `authenticated` role. Anonymous users receive `401 Unauthorized`.
- The `x-api-key` header containing the shared `OPENAI_PROXY_TOKEN` secret to satisfy the Function-level check.

If you need to loosen access for testing, remove `/api/chat` from the `routes` list or allow the `anonymous` role temporarily, then restore the stricter setting before production deployments.

## Azure Resources
1. **Azure Static Web App** – Hosts the front-end and orchestrates the Functions backend.
2. **Functions Environment** – Provisioned by SWA when the `api/` folder exists.
3. **Application Insights (optional)** – Enable for observability.

## GitHub Actions Workflow
When you create the SWA resource, Azure provisions a GitHub Actions workflow in `.github/workflows/`. Ensure the workflow defines:
```yaml
app_location: "/"           # or "src" depending on your build
api_location: "api"
output_location: "dist"      # Vite build output
```

### Required Secrets in GitHub
| Secret Name | Where to define | Purpose |
| --- | --- | --- |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | GitHub repository → Settings → Secrets | Authentication for the SWA deployment task. |
| `OPENAI_API_KEY` | Azure Portal → Static Web App → Configuration | Used by the Azure Function at runtime. |
| `OPENAI_PROXY_TOKEN` | Azure Portal → Static Web App → Configuration | Shared secret between the client and proxies. |

> Avoid storing `OPENAI_API_KEY` or `OPENAI_PROXY_TOKEN` as GitHub secrets unless you specifically need them for automated tests.

## Authentication Settings
Set the `EXPO_PUBLIC_EMAIL_CONFIRMATION_REDIRECT_TO` environment variable to the fully qualified URL of your deployed dashboard (for example, `https://app.example.com`). The value determines the redirect used when administrators confirm their email address. If the variable is absent, links fall back to `https://localhost:3000`, which is only suitable for local development. You can also provide the URL through `EXPO_PUBLIC_SITE_URL`, `EXPO_PUBLIC_APP_URL`, or `EXPO_PUBLIC_APP_BASE_URL`; the app uses the first non-empty value in that order.

## Security Recommendations
- Implement request logging with structured redaction to avoid storing sensitive prompt data.
- Add rate limiting and anomaly detection to the proxy endpoints to prevent abuse.
- Incorporate automated security testing (SAST/DAST) into CI/CD pipelines to catch regressions.

## Verification Checklist
- [ ] GitHub Actions workflow references `api_location: "api"`.
- [ ] Azure Static Web App configuration includes `OPENAI_API_KEY` and `OPENAI_PROXY_TOKEN`.
- [ ] Front-end requests include the `x-api-key` header.
- [ ] Secrets are never committed to the repository.
- [ ] `api/` folder is checked in so that SWA deploys the Functions app.
