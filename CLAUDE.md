# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

A collection of small, self-contained Japanese-language web tools published as single HTML files (Claude Artifacts and/or opened directly via `file://`). No build system, no package manager, no test suite — each tool is one `.html` file with inline `<style>` and `<script>`, no dependencies beyond a Google Fonts stylesheet link.

Current files:
- `index.html` — "文章づくり道具帖", a multi-tool suite (hash-router SPA) covering: 文字数カウント, 全角⇔半角変換, かな⇔ローマ字変換, 原稿用紙エディタ, 漢字利用チェック, 数くらべ.

## Working with this codebase

There is no build/lint/test tooling. To develop:
- Edit the `.html` file directly.
- Preview locally with a plain static server, e.g. `python3 -m http.server <port>` from this directory, then open `http://localhost:<port>/<file>.html`. Use direct `file://` double-click only as a final sanity check, not while iterating.
- Verify behavior by driving the page's own JS state (`document.getElementById(...).value = ...; el.dispatchEvent(new Event('input'))`, then read the resulting DOM/state back) rather than trusting a screenshot alone — screenshots in this environment have shown stale/cached renders after rapid navigation between views.
- Every page must start with `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8">…`. Omitting the charset meta tag breaks encoding detection when a user opens the file directly via `file://` — an earlier version that started straight from `<title>` with no charset declaration was confirmed to render as mojibake in Safari.

## Architecture

**Single-file convention.** Each tool ships as one `.html` file with everything inlined: CSS in a `<style>` block, JS in a `<script>` block at the end of `<body>`, and any static data (e.g. the kanji-grade table) as inline JS constants — never a separate fetched JSON/CSV. The only external network request permitted is the Google Fonts stylesheet link; nothing else may be fetched, and no user input is ever sent anywhere. Describe this to users as "入力文章は送信されません" (input text is never sent), not "完全にローカルで動作" (fully offline) — the Google Fonts request is real network activity, so the stronger claim is inaccurate.

**Multi-tool suites use hash routing, not multi-page.** `index.html` shows/hides `<section class="view" id="view-*">` blocks based on `location.hash` (`#/count`, `#/zenhan`, `#/kana`, `#/genkou`, `#/kanji`, `#/ratio`), toggled via a `.view.active` class in `renderRoute()`. Each tool's init logic is wrapped in its own IIFE and queries only its own element IDs, prefixed per tool (`cnt-`, `zh-`, `kn-`, `gk-`, `kj-`, `rt-`). Tools intentionally do not share input state with each other — each has its own input fields (a `<textarea>` for the text tools, number inputs for 数くらべ) — mirroring how these tools exist as separate pages on the reference site this suite was modeled after. Note that 数くらべ's hash (`#/ratio`) and element-id prefix (`rt-`) intentionally don't match its display name — they predate a rename from "割合・増減率" and were kept stable to avoid breaking links/bookmarks.

**Design tokens** are CSS custom properties on `:root`, redefined for dark mode via `@media (prefers-color-scheme: dark)` guarded with `:root:not([data-theme="light"])`, and again under `:root[data-theme="dark"]` for an explicit override (there is no theme-toggle UI yet — theme currently follows the OS only). Reuse these exact values for new tools rather than inventing a new palette:

```
--bg #F4F5F2   --surface #FFFFFF   --surface-sunken #ECEFEC
--ink #1D2422  --ink-soft #5C6B67  --ink-faint #8B9793
--accent #2C5F5E  --accent-strong #1B4443  --accent-soft #DFEBE8
--line #DBE1DD  --line-strong #C3CCC7  --warn #A6572B
```
(dark-mode equivalents are defined alongside each block; `--g1`…`--g6` / `--gx` are grade-highlight colors used only by 漢字利用チェック.)

Typography: **Shippori Mincho** (serif — branding mark, tool titles), **Zen Kaku Gothic New** (body/UI text), **JetBrains Mono** (numbers/stats, anything using `font-variant-numeric: tabular-nums`), loaded from Google Fonts with real fallback stacks. All UI copy is Japanese.

**Router gap:** `document.title` is never updated on `hashchange` in `renderRoute()` — every view shows the same browser-tab title. Update it there if per-view titles become important (tab disambiguation, SEO on a future multi-page split).

## Kanji-grade data (漢字利用チェック)

`KYOIKU_KANJI` (grades 1–6, 1026 characters total) was scraped from Japanese Wikipedia's 学年別漢字配当表 article and verified before embedding: exact per-grade counts (80/160/200/202/193/191), all 1026 characters unique, no duplicates. If this table is ever regenerated, re-verify those counts the same way rather than trusting a fresh scrape blindly.
