# AiBarber Backend Deployment Guide

This guide walks through configuring the new Azure Functions backend under the `api/` folder and wiring it up to your Azure Static Web Apps (SWA) deployment pipeline.

## 1. Repository Structure

```
/
├─ api/                # Azure Functions app (Node.js)
│  ├─ Assistant/       # HTTP trigger that proxies chat + transcription requests to OpenAI
│  ├─ GenerateImage/   # HTTP trigger for OpenAI image generation
│  ├─ host.json
│  ├─ package.json
│  └─ .gitignore
├─ src/                # SWA front-end
└─ ...
```

Azure Static Web Apps automatically discovers the Azure Functions application because it resides in the `api/` folder.

## 2. Local Development

1. Install the Azure Functions Core Tools and Node.js 18 or later.
2. From the repository root install dependencies:
   ```bash
   npm install
   (cd api && npm install)
   ```
3. Add a `api/local.settings.json` file (excluded from git) with your secrets:
   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "AzureWebJobsStorage": "UseDevelopmentStorage=true",
       "FUNCTIONS_WORKER_RUNTIME": "node",
       "OPENAI_API_KEY": "sk-your-key",
       "IMAGE_API_TOKEN": "local-dev-token"
     }
   }
   ```
4. Run both the SWA front-end and the Azure Functions backend locally using the SWA CLI or separate terminals:
   ```bash
   npm run dev          # front-end
   npm run start --prefix api   # backend (func start)
   ```

## 3. Secure Configuration

- `OPENAI_API_KEY` **must never be committed to the repository.** Store it as an application setting in Azure.
- The function expects requests to include an `x-api-key` header that matches `IMAGE_API_TOKEN`. This allows you to control who can call the API while keeping the function itself anonymous for SWA routing.
- Rotate keys regularly and remove unused secrets from Azure.

## 4. Azure Resources

1. **Azure Static Web App** – Hosts the front-end and orchestrates the Functions backend.
2. **Functions Environment** – Automatically provisioned by SWA when the `api/` folder exists.
3. **Application Insights (optional)** – Enable for observability.

## 5. GitHub Actions Workflow

When you create the SWA resource, Azure provisions a GitHub Actions workflow in `.github/workflows/`. Make sure the workflow defines the `app_location`, `api_location`, and `output_location` keys, for example:

```yaml
app_location: "/"           # or "src" depending on your build
api_location: "api"
output_location: "dist"      # Vite build output
```

### Required Secrets in GitHub

| Secret Name                        | Where to define                                   | Purpose                                               |
| ---------------------------------- | ------------------------------------------------- | ----------------------------------------------------- |
| `AZURE_STATIC_WEB_APPS_API_TOKEN`  | GitHub repository → Settings → Secrets            | Authentication for the SWA deployment task.           |
| `OPENAI_API_KEY`                   | Azure Portal → Static Web App → Configuration     | Used by the Azure Function at runtime.                |
| `IMAGE_API_TOKEN`                  | Azure Portal → Static Web App → Configuration     | Shared secret between the client and API.             |
| `EXPO_PUBLIC_ASSISTANT_API_TOKEN`  | GitHub repository → Settings → Secrets (optional) | Passed to the front-end build to call the Functions.  |

> Do **not** store `OPENAI_API_KEY` or `IMAGE_API_TOKEN` as GitHub secrets unless you specifically need them for unit tests. They should stay in the Azure environment. The optional `EXPO_PUBLIC_ASSISTANT_API_TOKEN` can live in GitHub secrets because it is only used as a lightweight shared key between the static front-end and the Azure Function.

## 6. Configure Azure Static Web App

1. In the Azure Portal, open your Static Web App resource.
2. Go to **Configuration** and add the following application settings:
   - `OPENAI_API_KEY` = `sk-...`
   - `IMAGE_API_TOKEN` = a random string that your assistant will send in the `x-api-key` header.
3. Trigger a redeploy from GitHub Actions or manually restart the Functions API to apply the new settings.

## 7. Consuming the API from the Assistant

Example `fetch` call from the SWA front-end (web build). When running the Expo native clients set `EXPO_PUBLIC_ASSISTANT_API_BASE_URL` to the full domain of your Static Web App so that `fetch` uses an absolute URL.

```ts
const response = await fetch('/api/assistant/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.EXPO_PUBLIC_ASSISTANT_API_TOKEN!,
  },
  body: JSON.stringify({
    messages: [
      { role: 'system', content: 'You are the AiBarber assistant.' },
      { role: 'user', content: 'List my upcoming bookings.' },
    ],
  }),
});

if (!response.ok) {
  throw new Error('Failed to reach the assistant function');
}

const data = await response.json();
```

Define `EXPO_PUBLIC_ASSISTANT_API_TOKEN` as a build-time environment variable for the front-end using GitHub secrets (surfaced to the workflow) or via SWA configuration if you later switch to server-side rendering.

## 8. Verification Checklist

- [ ] GitHub Actions workflow references `api_location: "api"`.
- [ ] Azure Static Web App configuration includes `OPENAI_API_KEY` and `IMAGE_API_TOKEN`.
- [ ] GitHub secret `EXPO_PUBLIC_ASSISTANT_API_TOKEN` is defined (or set locally for development).
- [ ] Front-end requests include the `x-api-key` header.
- [ ] Secrets are never committed to the repository.
- [ ] `api/` folder is checked in so that SWA deploys the Functions app.

Following this guide ensures your OpenAI-powered image generation endpoint is securely deployed alongside the AiBarber front-end using Azure Static Web Apps and GitHub Actions.
