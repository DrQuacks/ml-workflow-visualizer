# ML Workflow Visualizer (MVP Starter)

A minimal, Cursor-ready Next.js + TypeScript starter for visualizing ML/data workflows. The MVP supports:

- Upload CSV (client-only, PapaParse)
- Node card for **Read CSV** showing:
  - Parameters (editable)
  - **Generated Python code** (`pd.read_csv(...)`)
  - **Preview** table (first 100 rows)
- Extensible op registry for future nodes (train/test split, etc.)

## Quickstart

```bash
pnpm i        # or npm i / yarn
pnpm dev      # http://localhost:3000
```

> If using npm: `npm run dev`

## Project Structure

```
app/                # Next.js App Router
components/         # UI pieces (UploadDropzone, Inspector, TablePreview, CodeBlock)
core/               # types, registry, zustand store
plugins/            # operations (Read CSV)
styles/             # Tailwind setup
```

## How it Works

- Dropping/choosing a file caches it in `window.__fileMap`.
- A `Read CSV` node is created and registered in the global registry.
- The plugin's `preview()` parses the file with PapaParse and emits a `table` artifact.
- The `Inspector` updates parameters and regenerates Python code via `codegen()`.
- Click **Refresh Preview** to re-parse using current params.

## Roadmap (next steps)

- Add **Train/Test Split** plugin and connect outputs → inputs
- Introduce **React Flow** graph canvas and right-side inspector
- Implement **Export to .py** (codegen across nodes)
- Optional runtime toggle: Client-only → Pyodide → FastAPI kernel

## Notes

- The pandas function is `pd.read_csv` (underscore).
- This MVP avoids server code for simplicity.
```

## License

MIT
