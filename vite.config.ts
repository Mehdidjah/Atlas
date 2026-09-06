import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { fileURLToPath, URL } from 'node:url';

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

const staticSitesWorker = (): Plugin => ({
  name: 'aster-static-sites-worker',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'server/index.js',
      source: `export default {
  async fetch(request, env) {
    const assets = env && env.ASSETS;
    if (!assets || typeof assets.fetch !== 'function') {
      return new Response('Static asset binding is unavailable.', { status: 503 });
    }

    const response = await assets.fetch(request);
    const acceptsHtml = (request.headers.get('accept') || '').includes('text/html');
    if (response.status !== 404 || request.method !== 'GET' || !acceptsHtml) {
      return response;
    }

    const indexUrl = new URL('/index.html', request.url);
    return assets.fetch(new Request(indexUrl, request));
  },
};\n`,
    });
  },
});

export default defineConfig({
  build: { chunkSizeWarningLimit: 600 },
  css: { postcss: { plugins: [tailwindcss()] } },
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  server: isCodexSeatbeltSandbox
    ? { watch: { useFsEvents: false, usePolling: true } }
    : undefined,
  plugins: [react(), staticSitesWorker(), sites()],
});
