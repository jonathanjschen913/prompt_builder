# Prompt Builder

A local, offline Windows desktop app for authoring structured LLM prompts using XML-style tags. Pick a template, fill the inputs, hit **Generate & Copy**, paste anywhere.

## Download / install

There are no prebuilt releases published yet, so installation means building once from source. After that, the app behaves like any other Windows desktop app — no terminal required to launch it.

**Prerequisites:** Windows 10/11, [Node.js](https://nodejs.org/) 20.11+ (LTS), and `git`.

```powershell
git clone https://github.com/jonathanjschen913/prompt_builder.git
cd prompt_builder\app
npm install
npm run build
```

That produces two artifacts in `app\release\`:

- **`Prompt Builder Setup 0.1.0.exe`** — NSIS installer. Run once; it creates Start-menu and Desktop shortcuts.
- **`Prompt Builder Portable 0.1.0.exe`** — single self-contained exe. No install; double-click to run, or pin to your taskbar.

Either way, you never need to run `npm` again to launch the app.

> The build is **unsigned**, so the first launch will trigger Windows SmartScreen ("Windows protected your PC"). Click **More info → Run anyway**; Windows remembers your choice.

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
