# Assistant Proxy Server

This lightweight Express server keeps your OpenAI API key on the backend and exposes two routes that mirror the Expo client helpers:

- `POST /assistant/chat-completions`
- `POST /assistant/audio-transcriptions`

## Getting started

1. Install client dependencies (from the project root):

   ```bash
   npm install
   ```

2. Install the proxy dependencies:

   ```bash
   npm install --prefix server
   ```

3. Copy the environment template and populate it with your own keys:

   ```bash
   cp server/.env.example server/.env
   ```

4. Start the proxy:

   ```bash
   npm run start:assistant-proxy
   ```

   The proxy listens on `http://localhost:3000` by default. Update the `PORT` variable in the environment file to change it.

5. Point the Expo client at the proxy by setting `EXPO_PUBLIC_ASSISTANT_API_URL` in your Expo environment (for example in `.env` or your CI secrets) to the proxy's base URL. The mobile app will refuse to call OpenAI directly and will rely on this proxy instead.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `OPENAI_API_KEY` | ✅ | Secret key obtained from the OpenAI dashboard. |
| `PORT` |  | Port to bind the proxy to (defaults to `3000`). |
| `CORS_ORIGIN` |  | Comma-separated list of allowed origins. Leave unset to allow all origins during development. |

The server uses [`dotenv`](https://github.com/motdotla/dotenv) to load environment variables from `server/.env` when running locally. In production, supply the variables through your hosting provider instead.
