# AIBarber

This project now ships with an Azure Static Web Apps friendly Functions backend that can securely call
third-party AI providers (such as OpenAI) without exposing keys in the client bundle. The frontend
continues to run as a Static Web Apps site, while the API is executed in the free tier of Azure
Functions.

## Repository layout

```
/
├── App.tsx                # Expo/React Native application entry point
├── src/                   # Frontend code
└── api/                   # Azure Functions project used by Static Web Apps
    ├── openai-chat/       # HTTP POST proxy for chat completions
    └── openai-transcribe/ # HTTP POST proxy for audio transcription
```

## Frontend configuration

The frontend expects an API origin to be exposed under the same Static Web Apps domain. For local
workflows (or native testing where relative URLs are not supported) set an Expo environment variable
before starting the dev server:

```bash
# Point the app at the local Azure Functions host
export EXPO_PUBLIC_API_BASE_URL="http://localhost:7071"

# Optional: disable assistant features without touching the backend
export EXPO_PUBLIC_DISABLE_OPENAI="true" # omit or set to false to keep it enabled
```

The `EXPO_PUBLIC_API_BASE_URL` value is optional in hosted environments because the proxy is exposed
under `/api` by Static Web Apps.

## Azure Functions configuration

The `api` folder contains a minimal JavaScript Functions project with two HTTP-triggered endpoints:

- `POST /api/openai-chat` forwards chat-completion payloads to OpenAI (or Azure OpenAI if you point
  `OPENAI_API_BASE_URL` at that endpoint).
- `POST /api/openai-transcribe` forwards multipart audio uploads to the OpenAI transcription route.

Both functions require an `OPENAI_API_KEY` application setting. Optionally override the default
OpenAI REST base with `OPENAI_API_BASE_URL` or set `OPENAI_DEFAULT_CHAT_MODEL` to adjust the default
chat model used by the proxy.

### Local development

1. Install the [Azure Functions Core Tools](https://learn.microsoft.com/azure/azure-functions/functions-run-local#v4) (free).
2. Copy `api/local.settings.sample.json` to `api/local.settings.json` and fill in your OpenAI (or Azure OpenAI) key.
3. From the `api` directory, start the Functions host:
   ```bash
   cd api
   func start
   ```
4. In a separate terminal start the Expo dev server (web or native). With
   `EXPO_PUBLIC_API_BASE_URL=http://localhost:7071` the app will talk to the local Functions host.

### Deploying with Azure Static Web Apps

1. Configure your Static Web App build pipeline so that the `api` directory is deployed as the
   Functions app (this is the default when a folder named `api` is present).
2. In the Static Web Apps portal, add the following application settings under **Environment >
   Configuration**:
   - `OPENAI_API_KEY`: the secret key used by the Functions backend to call OpenAI securely.
   - `OPENAI_API_BASE_URL` (optional): set this if you are using Azure OpenAI or another compatible endpoint.
   - `OPENAI_DEFAULT_CHAT_MODEL` (optional): override the chat model without touching the code.
3. Redeploy the Static Web App. The frontend will call `/api/openai-chat` and `/api/openai-transcribe`
   without ever shipping the secret to the browser.

Because both Static Web Apps and Azure Functions offer always-free tiers, this setup keeps the
entire stack free while ensuring sensitive keys remain on the server.

## Security considerations

- The Functions endpoints accept anonymous requests but the key is never sent to the client.
- Rate limiting, additional validation, or authentication can be layered on later using Static Web
  Apps authentication or API Management without changing the frontend contract.

## Further reading

- [Azure Static Web Apps documentation](https://learn.microsoft.com/azure/static-web-apps/)
- [Azure Functions documentation](https://learn.microsoft.com/azure/azure-functions/)
- [OpenAI REST API reference](https://platform.openai.com/docs/api-reference)
