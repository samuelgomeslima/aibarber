# AiBarber Deployment & Secret Management Guide

This guide explains how to run the AiBarber front-end and Azure Functions backend securely on the Azure Static Web Apps (SWA) Free plan. It covers secret storage, GitHub Actions configuration, and how to develop locally with the front-end and backend served from the same port.

## 1. Repository Structure

```
/
├─ api/                    # Azure Functions app (Node.js)
│  ├─ _shared/             # Shared helpers (OpenAI auth, etc.)
│  ├─ AudioTranscription/  # POST /api/audio/transcriptions
│  ├─ ChatCompletion/      # POST /api/chat/completions
│  ├─ GenerateImage/       # POST /api/images/generate
│  ├─ host.json
│  └─ package.json
├─ src/                    # Expo / React front-end
├─ swa-cli.config.json     # Local dev profile for SWA CLI (single-port proxy)
└─ ...
```

Azure Static Web Apps automatically detects the Azure Functions project because it lives in the `api/` folder.

## 2. Secure Secret Storage

### Azure Static Web Apps configuration (runtime secrets)

Create the following application settings under **Settings → Configuration** in your SWA resource. These values are encrypted at rest and injected into the Azure Functions runtime.

| Setting name        | Purpose                                                                 |
| ------------------- | ----------------------------------------------------------------------- |
| `OPENAI_API_KEY`    | Used by all Azure Functions to authenticate with OpenAI.                |
| `IMAGE_API_TOKEN`   | Shared secret that incoming requests must provide via the `x-api-key` header. |

### Front-end build variables

The React front-end never sees the raw OpenAI key. Instead it sends the lightweight `IMAGE_API_TOKEN` so the Functions app can authenticate the request. Expose the token at build time with an Expo/Metro environment variable:

```
EXPO_PUBLIC_API_TOKEN=<same value as IMAGE_API_TOKEN>
```

You can define this variable in:

- **Azure Portal → Static Web App → Configuration → App settings** (prefix with `EXPO_PUBLIC_` so Expo injects it), or
- **GitHub Actions → `env:` block** when building for production (no need to store the OpenAI key in GitHub).

> ❗️Never commit secrets to the repository. Keep the OpenAI key only in Azure.

### GitHub Actions secrets

The auto-generated SWA workflow requires just one GitHub secret:

| Secret name                       | Where to add it                                      | Notes                                                         |
| --------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | GitHub → Settings → Secrets and variables → Actions  | Provided when you create the SWA resource in the Azure Portal |

Because the OpenAI key is stored in Azure, you do **not** need to add it to GitHub Actions unless you run server-side tests that require it.

## 3. Local Development on a Single Port

The included `swa-cli.config.json` lets you use the SWA CLI to proxy both the Expo web dev server and the Azure Functions runtime through `http://localhost:4280`.

```bash
npm install
(cd api && npm install)

# Terminal 1 - start the SWA proxy (front-end + functions on :4280)
npx @azure/static-web-apps-cli start --config swa-cli.config.json --app-name dev
```

The CLI launches `npm run web` (Expo dev server on port 19006) and `npm run start --prefix api` (Azure Functions on port 7071), then exposes them together at `http://localhost:4280`. This satisfies the “single port” requirement without needing a custom Vite setup.

If you prefer to use Vite for web builds, the following proxy snippet mirrors the same behaviour:

```ts
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:7071',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
```

With this configuration `npm run dev` (or `vite`) serves both the React router pages and the Azure Functions API through the same origin.

## 4. Running on the SWA Free Plan

1. In the Azure Portal create a **Static Web App** using the Free plan.
2. Point it to your GitHub repository and select the default workflow template.
3. When prompted, set:
   - **App location**: `./` (Expo app at the repository root)
   - **API location**: `api`
   - **Output location**: leave blank (Expo handles bundling).
4. After the resource is created, copy the deployment token and add it to `AZURE_STATIC_WEB_APPS_API_TOKEN` in GitHub secrets.
5. Under **Configuration**, add the `OPENAI_API_KEY`, `IMAGE_API_TOKEN`, and `EXPO_PUBLIC_API_TOKEN` settings.
6. Commit your changes; the GitHub Actions workflow builds the Expo web bundle and deploys the Functions API together.

## 5. End-to-end Request Flow

1. The front-end calls the helper in `src/lib/openai.ts`, which sends a POST request to `/api/chat/completions`, `/api/audio/transcriptions`, or `/api/images/generate`.
2. The request includes the `x-api-key` header whose value is injected at build time from `EXPO_PUBLIC_API_TOKEN`.
3. Azure Functions verifies the token against `IMAGE_API_TOKEN`, uses `OPENAI_API_KEY` to talk to OpenAI, and returns the result to the client.

This design keeps the OpenAI key entirely on the server while still allowing the Expo app (or any other client) to authenticate through a lightweight shared secret.

## 6. Verification Checklist

- [ ] `.github/workflows/*` workflow uses `app_location: "."` and `api_location: "api"`.
- [ ] Azure Static Web App configuration contains `OPENAI_API_KEY`, `IMAGE_API_TOKEN`, and `EXPO_PUBLIC_API_TOKEN`.
- [ ] No OpenAI credentials live in source control or GitHub Secrets.
- [ ] Front-end requests include the `x-api-key` header.
- [ ] Local development uses the SWA CLI (or Vite proxy) so the app and API share a port.

Following these steps keeps the OpenAI credentials safe, simplifies Azure deployment on the Free plan, and gives you a reliable single-origin development experience.
