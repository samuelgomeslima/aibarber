# Local Development (Single Port)

During development you can serve the Expo web build and the Azure Functions API on the same port by letting Vite proxy `/api` requests to the Functions emulator.

## 1. Install Dev Dependencies

```bash
npm install --save-dev vite @vitejs/plugin-react
```

## 2. Create `vite.config.ts`

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const FUNCTIONS_URL = process.env.VITE_FUNCTIONS_URL || 'http://localhost:7071';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: FUNCTIONS_URL,
        changeOrigin: true,
      },
    },
  },
});
```

The proxy forwards every `/api/*` request to your local Functions runtime running on port `7071`.

## 3. Start Everything

```bash
# terminal 1
cd api
npm run start

# terminal 2
VITE_FUNCTIONS_URL=http://localhost:7071 npx vite
```

You now access both the front-end and the Functions backend from `http://localhost:5173`. Azure Static Web Apps behaves the same way in production, exposing `/api/*` behind the same domain as the web app.
