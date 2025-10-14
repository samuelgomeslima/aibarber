# AIBarber Backend Deployment Guide

This guide walks through configuring the new Azure Functions backend under the `api/` folder and wiring it up to your Azure Static Web Apps (SWA) deployment pipeline.

## 1. Repository Structure

```
/
├─ api/                # Azure Functions app (Node.js)
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
      "OPENAI_PROXY_TOKEN": "local-dev-token",
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
- The HTTP triggers expect requests to include an `x-api-key` header that matches `OPENAI_PROXY_TOKEN`. This token now
  protects chat, transcription, and image proxy calls so you can control who can call the APIs while keeping the
  functions anonymous for SWA routing. For backwards compatibility, the image endpoint still accepts
  `IMAGE_API_TOKEN`, but plan to migrate to `OPENAI_PROXY_TOKEN`.
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

| Secret Name                   | Where to define                          | Purpose                                     |
| ----------------------------- | ---------------------------------------- | ------------------------------------------- |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | GitHub repository → Settings → Secrets    | Authentication for the SWA deployment task. |
| `OPENAI_API_KEY`              | Azure Portal → Static Web App → Configuration | Used by the Azure Function at runtime.      |
| `OPENAI_PROXY_TOKEN`          | Azure Portal → Static Web App → Configuration | Shared secret between the client and chat/transcribe/image proxies. |
| `IMAGE_API_TOKEN` *(optional)* | Azure Portal → Static Web App → Configuration | Legacy shared secret accepted by the image proxy. |

> Do **not** store `OPENAI_API_KEY`, `IMAGE_API_TOKEN`, or `OPENAI_PROXY_TOKEN` as GitHub secrets unless you specifically need them for unit tests. They should stay in the Azure environment.

## 6. Configure Azure Static Web App

1. In the Azure Portal, open your Static Web App resource.
2. Go to **Configuration** and add the following application settings:
   - `OPENAI_API_KEY` = `sk-...`
   - `OPENAI_PROXY_TOKEN` = a random string that protects `/api/chat`, `/api/transcribe`, and `/api/images/generate`.
   - *(Optional)* `IMAGE_API_TOKEN` = legacy fallback for image requests if you have older clients deployed.
3. Trigger a redeploy from GitHub Actions or manually restart the Functions API to apply the new settings.

## 7. Consuming the API from the Assistant

Example `fetch` call from the SWA front-end:

```ts
const response = await fetch('/api/images/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': import.meta.env.VITE_OPENAI_PROXY_TOKEN,
  },
  body: JSON.stringify({
    prompt: 'High-resolution haircut design for a modern barber shop',
    size: '1024x1024',
    quality: 'high',
    response_format: 'b64_json',
  }),
});

if (!response.ok) {
  throw new Error('Failed to generate image');
}

const data = await response.json();
```

> ℹ️ The function only supports `POST` requests. Navigating to
> `https://<your-app-name>.azurestaticapps.net/api/images/generate` in a
> browser issues a `GET` and results in a 404. Use a tool such as
> `curl`, Postman, or your front-end to send a `POST` request with the
> required headers and JSON body instead:

```bash
curl -X POST "https://<your-app-name>.azurestaticapps.net/api/images/generate" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $OPENAI_PROXY_TOKEN" \
  -d '{"prompt":"High-resolution haircut design"}'
```

Define `VITE_OPENAI_PROXY_TOKEN` (Vite build) or `EXPO_PUBLIC_OPENAI_PROXY_TOKEN` (Expo dev server) as a build-time environment variable for the front-end using the SWA configuration or GitHub Actions if necessary. The image helper still
accepts `VITE_IMAGE_API_TOKEN`/`EXPO_PUBLIC_IMAGE_API_TOKEN` as a fallback, but plan to migrate to the unified proxy token.

## 8. Verification Checklist

- [ ] GitHub Actions workflow references `api_location: "api"`.
- [ ] Azure Static Web App configuration includes `OPENAI_API_KEY` and `OPENAI_PROXY_TOKEN` (`IMAGE_API_TOKEN` optional for legacy clients).
- [ ] Front-end requests include the `x-api-key` header.
- [ ] Secrets are never committed to the repository.
- [ ] `api/` folder is checked in so that SWA deploys the Functions app.

Following this guide ensures your OpenAI-powered image generation endpoint is securely deployed alongside the AIBarber front-end using Azure Static Web Apps and GitHub Actions.
