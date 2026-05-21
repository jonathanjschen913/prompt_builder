# Prompt Builder

A local, offline desktop app for authoring structured LLM prompts using XML-style tags (`<instruction>`, `<context>`, `<output_format>`, …). Pick a template, fill the inputs, hit **Generate & Copy**, and paste the assembled prompt into Claude, ChatGPT, an API playground, or anywhere else.

- 100% local — no network calls, no telemetry, no accounts.
- All data lives in a single JSON file on your machine.
- Built with Electron + React + TypeScript + Tailwind + Vite.

---

## Prerequisites

- **Windows 10 or 11** (target platform).
- **Node.js 20.11+** (LTS) or newer for development. Tested on Node 24.x. Confirm with `node -v`.
- npm 10+ (ships with Node).

No native modules. No Visual Studio Build Tools or Python required.

## Install & run (development)

```powershell
cd app
npm install
npm run dev
```

This launches Electron pointing at the Vite dev server with hot-reload for the renderer.

## Build a distributable for Windows

```powershell
cd app
npm run build
```

This produces, in `app/release/`:

- **`Prompt Builder Setup <version>.exe`** — NSIS installer. Installs to Program Files (or per-user, your choice), creates a Start Menu entry.
- **`Prompt Builder Portable <version>.exe`** — a single-file portable build that runs without installation.

The build is **unsigned** by design. The first time you (or a friend) opens either `.exe`, Windows SmartScreen will say:

> Windows protected your PC

Click **More info** → **Run anyway** to launch. After the first run Windows remembers your choice.

## Where is my data stored?

A single JSON file at:

```
%APPDATA%\prompt-builder\data.json
```

(Resolves to something like `C:\Users\<you>\AppData\Roaming\prompt-builder\data.json`.)

The file is written debounced and atomically (write to `.tmp`, then rename). If it ever becomes unreadable or corrupt, the app will:

1. Move the bad file aside to `data.json.broken.<timestamp>`,
2. Re-seed with the built-in defaults,
3. Continue running — your previous data is preserved in the `.broken.*` file for recovery.

You can back up or move this file freely. The app also supports **Settings → Export…** and **Settings → Import…** to save or restore the file via a dialog.

## How to use

1. **Pick a template** from the left sidebar. The four built-ins (Basic, Standard, Few-shot, Full) give you a starting point; add your own with **+ New Template**.
2. **Fill in the textareas.** Each one corresponds to a tag in the template. Leave any field empty to skip that tag in the output.
3. **Click Generate & Copy** (or press <kbd>Ctrl</kbd>+<kbd>Enter</kbd>). The assembled prompt is copied to your clipboard. The fields that contributed flash green.
4. Toggle **Preview** at the bottom-left to see the assembled output update live as you type.

### Tags

Manage your tag library from the sidebar's **Manage Tags** button.

- **Built-in tags** can be hidden but not deleted.
- **Custom tags** can be renamed, edited, or deleted (with a confirmation if any template uses them).
- Tag names must match `^[a-z][a-z0-9_]*$` — lowercase, underscores allowed, must start with a letter.

### Templates

Each template is an **ordered** list of tags. The same tag can appear more than once (e.g., two `examples` blocks).

- Click the **pencil** next to the template name to rename it inline.
- Click the **•••** menu for Edit Tags / Duplicate / Delete.
- The template editor supports drag-to-reorder (handle on the left of each row) and a "Revert" button that discards unsaved edits and reloads from the last saved state (with confirmation).

### Drafts

What you type is saved automatically (debounced) per template, per textarea position. Close the app and reopen and your in-progress prompts come back exactly where you left them.

## Keyboard shortcuts

| Action               | Shortcut                            |
| -------------------- | ----------------------------------- |
| Generate & Copy      | <kbd>Ctrl</kbd>+<kbd>Enter</kbd>    |
| New Template         | <kbd>Ctrl</kbd>+<kbd>N</kbd>        |
| Clear All inputs     | <kbd>Ctrl</kbd>+<kbd>L</kbd>        |
| Open Tag Manager     | <kbd>Ctrl</kbd>+<kbd>,</kbd>        |
| Close any open modal | <kbd>Esc</kbd>                      |

Shortcuts are suppressed while a modal is open (except <kbd>Esc</kbd>, which closes it).

## Output format

For each tag in the active template, in order:

- Trim the textarea's value.
- If empty, **skip** the tag entirely (no empty `<tag></tag>` pairs).
- Otherwise emit:

  ```
  <name>
  <your trimmed content>
  </name>
  ```

  separated from the next block by one blank line.

Trailing whitespace is stripped from the final string. Your content is inserted **verbatim** — no escaping, no transformations. You are responsible for knowing what you're pasting downstream.

## Theming

System / Light / Dark from **Settings**. System-mode follows your OS preference live.

## Project layout

```
app/
├── electron-builder.yml      # Win installer + portable config
├── electron.vite.config.ts   # Vite + electron-vite config
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json             # references node + web configs
├── tsconfig.node.json        # main + preload + shared (Node env)
├── tsconfig.web.json         # renderer + shared (DOM env)
├── resources/
│   └── icon.ico              # generated by scripts/make-icon.cjs
├── scripts/
│   └── make-icon.cjs         # placeholder PB icon generator
└── src/
    ├── main/                 # Electron main process
    │   ├── index.ts          # whenReady → load data → window + ipc
    │   ├── ipc.ts            # ipc handlers for data/clipboard/import-export
    │   ├── storage.ts        # atomic load/save + corrupt-file recovery
    │   └── window.ts         # window creation + bounds persistence
    ├── preload/              # contextBridge api surface
    ├── renderer/             # React + Tailwind UI
    │   ├── index.html
    │   └── src/
    │       ├── App.tsx
    │       ├── main.tsx
    │       ├── store.ts      # Zustand: tags, templates, drafts, theme
    │       ├── components/   # UI primitives + features
    │       └── lib/          # generate, validate, theme, shortcuts
    └── shared/               # types + IPC channel constants + seed defaults
```

## Replacing the icon

To swap the placeholder icon, replace `resources/icon.ico` with your own (256×256 minimum). Then rebuild. If you ever want to regenerate the placeholder, run:

```powershell
npm run icon
```

## Constraints (by design)

- No LLM calls, no network requests, no analytics, no auto-update, no crash reporting.
- Windows-only build. The codebase is platform-portable but `npm run build` only targets Windows.
- No code signing — friends will see SmartScreen on first launch.
- Renderer runs with `contextIsolation: true`, `nodeIntegration: false`. The renderer talks to disk and clipboard only via the typed `window.api` surface exposed by the preload script.

## License

MIT.
