import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

const sitesWorkerSource = `export default {
  async fetch(request, env) {
    const assets = env && env.ASSETS;
    if (!assets || typeof assets.fetch !== 'function') {
      return new Response('Static asset binding is unavailable.', { status: 503 });
    }

    const acceptsHtml = (request.headers.get('accept') || '').includes('text/html');
    if (request.method === 'GET' && acceptsHtml) {
      const indexUrl = new URL('/index.html', request.url);
      return assets.fetch(new Request(indexUrl, request));
    }

    return assets.fetch(request);
  },
};\n`;
const staticSitesWorker = (): Plugin => {
  let projectRoot = process.cwd();

  return {
    name: 'aster-static-sites-worker',
    configResolved(config) {
      projectRoot = config.root;
    },
    async closeBundle() {
      const serverDirectory = resolve(projectRoot, 'dist', 'server');
      await mkdir(serverDirectory, { recursive: true });
      await writeFile(resolve(serverDirectory, 'index.js'), sitesWorkerSource);
    },
  };
};

export default defineConfig({
  build: { chunkSizeWarningLimit: 600, outDir: 'dist/client' },
  css: { postcss: { plugins: [tailwindcss()] } },
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  server: isCodexSeatbeltSandbox
    ? { watch: { useFsEvents: false, usePolling: true } }
    : undefined,
  plugins: [react(), staticSitesWorker(), sites()],
});
