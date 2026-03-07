## Cursor Cloud specific instructions

This is a pure client-side React SPA (Gradle Dependency Visualizer) — no backend, no database, no Docker.

### Available npm scripts

See `package.json` for all scripts: `dev`, `build`, `lint`, `preview`.

### Known issues

- `npm run build` (`tsc -b && vite build`) fails with pre-existing TypeScript type errors in `src/components/ForceGraph.tsx` (D3 type compatibility). The Vite dev server (`npm run dev`) works fine since it uses esbuild for transpilation.

### Running the dev server

```bash
npm run dev -- --host 0.0.0.0 --port 5173
```

The app will be available at `http://localhost:5173`. No external services or environment variables are needed.
