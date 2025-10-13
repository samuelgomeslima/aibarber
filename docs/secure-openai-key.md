# Securing OpenAI API Keys in Azure Static Web Apps

## Overview
Storing your OpenAI API key directly in frontend code exposes it to end users. Instead, proxy requests through a backend that keeps the key secret. Azure Static Web Apps (SWA) includes a free Managed Functions environment (the `/api` folder) that can host backend APIs without revealing secrets in client-side code.

## Folder Structure
```
root
├── api
│   └── functions
│       ├── chat.js
│       └── transcribe.js
├── src
│   └── ...
└── staticwebapp.config.json
```

* `api/functions/chat.js`: Azure Function handling requests to `/api/chat`.
* `api/functions/transcribe.js`: Azure Function handling requests to `/api/transcribe`.
* `staticwebapp.config.json`: Optional routing config to secure endpoints (if not already present).

## Step 1: Store the OpenAI API Key as a Secret
1. In the Azure Portal, open your Static Web App.
2. Go to **Settings → Configuration → Application settings**.
3. Add a new setting:
   * **Name**: `OPENAI_API_KEY`
   * **Value**: `sk-fake-example1234567890`
4. Save and click **Apply** so the function app restarts with the new secret.

> 💡 Environment variables stored in SWA configuration are only available server-side and are not exposed to the client bundle.

## Step 2: Implement the Azure Functions
The repository ships with JavaScript implementations that proxy chat completions and audio transcriptions to OpenAI while keeping the API key on the server:

* `api/functions/chat.js` forwards chat completion requests to `https://api.openai.com/v1/chat/completions`.
* `api/functions/transcribe.js` accepts audio uploads and forwards them to `https://api.openai.com/v1/audio/transcriptions`.

Both handlers validate incoming payloads, surface helpful error messages, and return the OpenAI response body. Refer to the source files for the latest logic.

### Local Development Configuration
To test locally with the SWA CLI:

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

3. Add a `.env.local` file with the local function URLs:

```bash
EXPO_PUBLIC_CHAT_API_URL=http://localhost:7071/api/chat
EXPO_PUBLIC_TRANSCRIBE_API_URL=http://localhost:7071/api/transcribe
```

4. Run the app: `swa start http://localhost:5173 --api-location ./api` (or `npm run start --prefix api` in another terminal).
5. Your frontend can now call the local proxy endpoints without exposing the key.

## Step 3: Frontend Usage
In your React/Vue/Svelte/etc. frontend, call the backend instead of OpenAI directly:

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

Because the browser calls your SWA endpoint, the OpenAI API key never leaves the server environment.

## Optional: Restrict Direct Access
If you want to restrict access to `/api/chat` to authenticated users, add a `staticwebapp.config.json` file in the project root:

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

This configuration requires users to sign in with any provider you have enabled (e.g., GitHub, Microsoft) before they can call the API.

## Summary
* Never embed API keys in client-side bundles.
* Use the `/api` folder in Azure Static Web Apps to host secure serverless functions.
* Store secrets in SWA configuration settings and reference them via `process.env` in your backend code.
* During development, use `local.settings.json` to load environment variables locally.
