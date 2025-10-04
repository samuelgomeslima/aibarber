# Image Assistant Local Setup

The image assistant screen consumes the Azure Functions endpoint under `api/GenerateImage`. Follow the steps below to configure everything locally.

## 1. Install prerequisites

- **Node.js 18+**
- **npm** (bundled with Node.js)
- **Azure Functions Core Tools** (for running the API locally)

## 2. Install dependencies

From the repository root install both the Expo app and the Azure Functions packages:

```bash
npm install
(cd api && npm install)
```

## 3. Configure environment variables

### 3.1 Front-end (Expo)

Create a file named `.env.local` in the project root and add the following values:

```bash
EXPO_PUBLIC_OPENAI_API_KEY=sk-your-openai-api-key
EXPO_PUBLIC_IMAGE_API_TOKEN=local-dev-token
```

Expo automatically exposes variables prefixed with `EXPO_PUBLIC_` to the client at runtime. Restart the dev server whenever these values change.

### 3.2 Azure Function

Create `api/local.settings.json` (excluded from git) with matching secrets:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "OPENAI_API_KEY": "sk-your-openai-api-key",
    "IMAGE_API_TOKEN": "local-dev-token"
  }
}
```

Make sure `IMAGE_API_TOKEN` matches the value used in `.env.local`. The function checks the `x-api-key` header and rejects requests that do not match.

## 4. Start the services

Use two terminals (or run the commands in the background):

```bash
npm run dev            # starts Expo for the front-end (web, iOS, or Android)
npm run start --prefix api   # starts the Azure Functions app (func start)
```

> If you prefer the Static Web Apps CLI, you can alternatively run `npx swa start http://localhost:8081 --run "npm run dev"`.

## 5. Generate images

1. Open the Expo web experience (default at http://localhost:8081 for Expo web).
2. Navigate to **Image lab** from the sidebar.
3. Enter a prompt, choose a size/quality combination, and press **Generate image**.
4. The assistant stores recent results locally so you can compare variations or clear the history with the **Clear** button.

If requests fail with **Unauthorized request**, double-check that:

- `EXPO_PUBLIC_IMAGE_API_TOKEN` is defined in `.env.local`.
- `IMAGE_API_TOKEN` in `api/local.settings.json` matches the same string.
- The Azure Functions server has been restarted after editing `local.settings.json`.

With these steps you can iterate on prompts locally while keeping API keys out of source control.
