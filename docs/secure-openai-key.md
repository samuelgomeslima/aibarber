# Securing OpenAI API Keys in Azure Static Web Apps

## Overview
Storing your OpenAI API key directly in frontend code exposes it to end users. Instead, proxy requests through a backend that keeps the key secret. Azure Static Web Apps (SWA) includes a free Managed Functions environment (the `/api` folder) that can host backend APIs without revealing secrets in client-side code.

## Folder Structure
```
root
├── api
│   └── chat
│       └── index.ts
├── src
│   └── ...
└── staticwebapp.config.json
```

* `api/chat/index.ts`: Azure Function handling requests to `/api/chat`.
* `staticwebapp.config.json`: Optional routing config to secure endpoints (if not already present).

## Step 1: Store the OpenAI API Key as a Secret
1. In the Azure Portal, open your Static Web App.
2. Go to **Settings → Configuration → Application settings**.
3. Add a new setting:
   * **Name**: `OPENAI_API_KEY`
   * **Value**: `sk-fake-example1234567890`
4. Save and click **Apply** so the function app restarts with the new secret.

> 💡 Environment variables stored in SWA configuration are only available server-side and are not exposed to the client bundle.

## Step 2: Implement the Azure Function
Below is a sample TypeScript function using Azure Static Web Apps' serverless API folder. Requests to `https://example-username.azurestaticapps.net/api/chat` will run this handler.

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

3. Run the app: `swa start http://localhost:5173 --api-location ./api`.
4. Your frontend can now call `http://localhost:4280/api/chat` without exposing the key.

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
