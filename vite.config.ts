import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { fileURLToPath, URL } from 'node:url';

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

const localMetaApi = (): Plugin => {
  const respond = (response: import('node:http').ServerResponse) => {
    response.statusCode = 200;
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(
      JSON.stringify({
        configured: false,
        redirectUri: 'Configure META_REDIRECT_URI in the deployed environment',
        requiredPermissions: [
          'ads_read',
          'ads_management',
          'business_management',
        ],
        connection: null,
        accounts: [],
      }),
    );
  };
  return {
    name: 'aster-local-meta-api',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const url = new URL(request.url ?? '/', 'http://localhost');
        if (request.method === 'GET' && url.pathname === '/api/meta/status') {
          respond(response);
          return;
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        const url = new URL(request.url ?? '/', 'http://localhost');
        if (request.method === 'GET' && url.pathname === '/api/meta/status') {
          respond(response);
          return;
        }
        next();
      });
    },
  };
};

// Vite is an honest UI preview, not an authentication server.
const localAuthApi = (): Plugin => {
  const install = (server: { middlewares: import('vite').Connect.Server }) => {
    server.middlewares.use((request, response, next) => {
      const url = new URL(request.url ?? '/', 'http://localhost');
      if (!url.pathname.startsWith('/api/auth/')) return next();
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (request.method === 'GET' && url.pathname === '/api/auth/providers') {
        response.end(
          JSON.stringify({ google: false, facebook: false, hosted: false }),
        );
      } else if (
        request.method === 'GET' &&
        url.pathname === '/api/auth/session'
      ) {
        response.end(JSON.stringify({ user: null, workspaces: [] }));
      } else if (
        request.method === 'POST' &&
        url.pathname === '/api/auth/logout'
      ) {
        response.statusCode = 204;
        response.end();
      } else {
        response.statusCode = 503;
        response.end(
          JSON.stringify({
            error: {
              code: 'provider_unavailable',
              message:
                'Sign-in is unavailable in the local preview. Configure the deployed Worker and identity provider; no account or session has been created.',
            },
          }),
        );
      }
    });
  };
  return {
    name: 'aster-local-auth-api',
    configureServer: install,
    configurePreviewServer: install,
  };
};

export default defineConfig({
  build: { chunkSizeWarningLimit: 600, outDir: 'dist/client' },
  css: { postcss: { plugins: [tailwindcss()] } },
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  server: isCodexSeatbeltSandbox
    ? { watch: { useFsEvents: false, usePolling: true } }
    : undefined,
  plugins: [react(), localMetaApi(), localAuthApi(), sites()],
});
