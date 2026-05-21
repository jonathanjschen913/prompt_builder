# Prompt Builder

A local, offline Windows desktop app for authoring structured LLM prompts using XML-style tags. Pick a template, fill the inputs, hit **Generate & Copy**, paste anywhere.

## Download

Grab a prebuilt Windows binary from the [latest release](https://github.com/jonathanjschen913/prompt_builder/releases/latest):

- **`Prompt Builder Setup <version>.exe`** — NSIS installer. Run once; it creates Start-menu and Desktop shortcuts.
- **`Prompt Builder Portable <version>.exe`** — single self-contained exe. No install; double-click to run, or pin to your taskbar.

Either one works on Windows 10 and 11. No Node, no terminal, no dependencies to install.

> The build is **unsigned**, so the first launch will trigger Windows SmartScreen ("Windows protected your PC"). Click **More info → Run anyway**; Windows remembers your choice.

### Build from source (optional)

If you'd rather build it yourself, you'll need [Node.js](https://nodejs.org/) 20.11+ (LTS) and `git`:

```powershell
git clone https://github.com/jonathanjschen913/prompt_builder.git
cd prompt_builder\app
npm install
npm run build
```

The same two artifacts land in `app\release\`.

## What it is

Prompt Builder helps you compose tagged prompts (`<instruction>…</instruction>`, `<context>…</context>`, etc.) faster than typing tags by hand. XML-style tags are a recommended practice for models like Claude because they disambiguate sections of a prompt.

- **100% local.** No network calls, no telemetry, no accounts. All data lives in a single JSON file in `%APPDATA%\prompt-builder\data.json`.
- **Tags** are your reusable building blocks. Seven sensible defaults ship in (`instruction`, `context`, `input`, `examples`, `output_format`, `constraints`, `role`); add your own from **Manage Tags**.
- **Templates** are ordered lists of tags. Four built-in templates (Basic, Standard, Few-shot, Full) get you started. Create, rename, duplicate, or reorder freely.
- **Drafts auto-save** per template, per textarea — close the app, reopen, and everything is exactly where you left it.
- **Drag-to-reorder** templates in the sidebar and input boxes within a template.
- **Undo / redo** for tag and draft changes (<kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Y</kbd>).
- **Light, Dark, and System themes.**

## How it generates

For each tag in the active template (in order), if the textarea is non-empty:

```
<name>
<your trimmed content>
</name>
```

Empty fields are skipped — no `<tag></tag>` pairs. Content is inserted verbatim; you're responsible for what you paste downstream.

## Keyboard shortcuts

| Action               | Shortcut                            |
| -------------------- | ----------------------------------- |
| Generate & Copy      | <kbd>Ctrl</kbd>+<kbd>Enter</kbd>    |
| New Template         | <kbd>Ctrl</kbd>+<kbd>N</kbd>        |
| Clear All inputs     | <kbd>Ctrl</kbd>+<kbd>L</kbd>        |
| Open Tag Manager     | <kbd>Ctrl</kbd>+<kbd>,</kbd>        |
| Undo / Redo          | <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Y</kbd> |
| Close any open modal | <kbd>Esc</kbd>                      |

## Tech

Electron + React + TypeScript + Tailwind + Vite, packaged with electron-builder. See [`app/README.md`](app/README.md) for the full developer guide: data file layout, project structure, recovery behavior, theming, and design constraints.

## License

MIT.
