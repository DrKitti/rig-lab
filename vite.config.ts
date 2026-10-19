import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

const RIG_DIR = fileURLToPath(new URL('./src/data', import.meta.url));
const NAME = /^[a-z0-9-]+$/i;
const SHOT_DIR = fileURLToPath(new URL('./assets/drafts/shots', import.meta.url));
const ROOT_DIR = fileURLToPath(new URL('.', import.meta.url));

/** Preserve JSON texture paths in static builds as well as in the dev editor. */
function rigAssets(): Plugin {
  return {
    name: 'rig-assets',
    apply: 'build',
    async generateBundle() {
      const textures = new Set<string>();
      for (const file of await readdir(RIG_DIR)) {
        if (!file.endsWith('.rig.json')) continue;
        const source = await readFile(resolve(RIG_DIR, file), 'utf8');
        const rig = JSON.parse(source) as { textures: Record<string, string> };
        this.emitFile({ type: 'asset', fileName: `rigs/${file}`, source });
        for (const path of Object.values(rig.textures)) textures.add(path);
      }
      for (const path of textures) {
        if (!path.startsWith('assets/') || path.split('/').includes('..') || path.includes('\\')) {
          throw new Error(`Texture path must be project-relative under assets/: ${path}`);
        }
        this.emitFile({ type: 'asset', fileName: path, source: await readFile(resolve(ROOT_DIR, path)) });
      }
    },
  };
}

/**
 * Dev-only endpoints so the editor can load and save rig files in src/data/<name>.rig.json.
 * The editor fetches rigs instead of importing them, so saving never triggers a page reload.
 */
function rigFiles(): Plugin {
  return {
    name: 'rig-files',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__rig/', async (req, res) => {
        const url = new URL(req.url ?? '', 'http://x');
        const name = url.pathname.replace(/^\//, '');
        if (!NAME.test(name)) {
          res.statusCode = 400;
          res.end('bad rig name');
          return;
        }
        const file = resolve(RIG_DIR, `${name}.rig.json`);
        try {
          if (req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json');
            res.end(await readFile(file, 'utf8'));
            return;
          }
          if (req.method === 'POST') {
            let body = '';
            for await (const chunk of req) body += chunk;
            const rig = JSON.parse(body);
            await writeFile(file, JSON.stringify(rig, null, 2) + '\n', 'utf8');
            res.end('ok');
            return;
          }
          res.statusCode = 405;
          res.end();
        } catch (err) {
          res.statusCode = 500;
          res.end(String(err));
        }
      });

      // Saves a PNG posted from the page (renders captured with the real Pixi renderer) to SHOT_DIR.
      server.middlewares.use('/__shot/', async (req, res) => {
        const name = new URL(req.url ?? '', 'http://x').pathname.replace(/^\//, '');
        if (req.method !== 'POST' || !/^[a-z0-9_-]+$/i.test(name)) {
          res.statusCode = 400;
          res.end('bad shot');
          return;
        }
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        await mkdir(SHOT_DIR, { recursive: true });
        await writeFile(resolve(SHOT_DIR, `${name}.png`), Buffer.concat(chunks));
        res.end('ok');
      });
    },
  };
}

export default defineConfig({
  plugins: [rigFiles(), rigAssets()],
  server: {
    // Saved rig files must not trigger HMR reloads mid-edit.
    watch: { ignored: ['**/src/data/*.rig.json'] },
  },
});
