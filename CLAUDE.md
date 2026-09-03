# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

A collection of small, self-contained Japanese-language web tools published as single HTML files (Claude Artifacts and/or opened directly via `file://`). No build system, no package manager, no test suite — each tool is one `.html` file with inline `<style>` and `<script>`, no dependencies beyond a Google Fonts stylesheet link.

Current files:
- `index.html` — "道具帖", a multi-tool suite (hash-router SPA). Tools are grouped into categories: 文章づくり道具帖 (文字数カウント, 全角⇔半角変換, かな⇔ローマ字変換, 原稿用紙エディタ, 漢字利用チェック), 数字を読み解く (数くらべ). See "サイト名の階層とカテゴリ見出し" below.

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

**Per-view tab titles:** `renderRoute()` sets `document.title` from the `ROUTE_TITLES` map (`"ツール名 | 道具帖"`, or bare `"道具帖"` for the cover). When adding a new tool, add it to `VIEWS` and `ROUTE_TITLES` together, and to the correct category in both `#view-cover` and its own `.tool-header .category`.

## サイト名の階層とカテゴリ見出し

サイト名は「道具帖」(ヘッダーのロゴ・トップページの見出し・`<title>` の既定値)。その下にツールをまとめるカテゴリが並ぶ: 文章づくり道具帖(文字数カウント・全角⇔半角変換・かな⇔ローマ字変換・原稿用紙エディタ・漢字利用チェック)、数字を読み解く(数くらべ)、時間を見渡す(現時点で公開ツールなし)。「文章づくり道具帖」は旧サイト名をそのままカテゴリ名として据え置いたもの。

- トップページ(`#view-cover`)はカテゴリごとに `.cover-group` で分け、各グループの先頭に `.cover-group-heading` を置く。この見出しは意図的に非インタラクティブ — リンクにせず、タブ・折り畳み・選択式UIにもしない。見た目も `.stat-group h2` や `.rt-sentence-label` と同じ「静かな小見出し」系統(0.72rem・太字・字間広め・`--ink-faint`・背景/枠なし)を流用し、階層が大げさに見えないようにしている。
- 個別ツールページの `.tool-header` にも所属カテゴリを `<p class="category">` として表示する(「← 道具帖トップ」とh2見出しの間)。こちらもリンクにしない — カテゴリ専用ページがまだ存在せず、押せる要素にすると遷移先と表示が食い違うため。
- 「時間を見渡す」はツールが1つもないため、DOM上にも一切出力していない(Coming soon等のプレースホルダーも出さない)。`index.html` の `#view-cover` 内にコメントで理由を残している。このカテゴリに最初のツールを追加する時点で `.cover-group` を1つ追加すること。

## 原稿用紙エディタ (縦書き)

原稿用紙エディタは縦書き専用。横書きモードは廃止済みで、切り替え機能は設けていない(参考にしたサイトが縦書きだったため、横書きは実装時に落ちた未達仕様だった経緯はROADMAP.mdを参照)。

- `layoutGenkou()` は書字方向に依存しない。「20マスの行」内の位置(`col`)としてしか位置を追跡せず、シートごとのフラットな `{main, trail}` セル配列を返すだけなので、横書き・縦書きどちらの描画にも同じ関数をそのまま使える。縦書きでは「行頭」=列の最上部、「行末」=列の最下部として同じ禁則ロジック(`KINSOKU_HEAD_FORBID` の行頭ぶら下げ、開きかっこの行末禁則による改行送り)が働く。
- 描画(`initGenkou()` の `render()`)は `.gk-grid` に `grid-auto-flow: column` を使い、`layoutGenkou()` が返すフラット配列をそのままDOM出現順で流し込むだけで列優先(上→下→次の列)の配置になる。列の並び順(1列目が右)は `.gk-scroll`(`.gk-grid` の親)に `direction: rtl` を掛けることで実現しており、同時にこれにより `scrollLeft = 0` が「右端(1列目が見える位置)」を意味するようになる — 初期表示・ページ送り時に右端へ戻す処理は単に `scrollLeft = 0` を代入するだけでよい。
- 用紙(`.gk-grid`)は `width:100%; min-width:400px; max-width:640px; aspect-ratio:1;` でマスサイズ20〜32pxの範囲に収まるようレスポンシブに拡縮する。`.gk-scroll` が `overflow-x:auto` を持つため、コンテナ幅が400px未満になっても用紙自体は縮まず、横スクロールで対応する(ページ全体の縦スクロールには影響しない)。
- 約物の見た目は文字ごとに分類してCSSクラスを振ることで制御している(`classifyGlyph()`)。`gk-corner`(読点・句点・小書き仮名 → マス右上に小さく配置)、`gk-rotate`(長音符ー・ダッシュ— → `writing-mode:horizontal-tb` + `transform:rotate(90deg)` で強制的に縦線化)、`gk-upright`(？！ → `writing-mode:horizontal-tb` のみで回転させない)。開きかっこ類は明示クラスを持たせず、`writing-mode:vertical-rl` のデフォルトの縦書きグリフ変形に委ねている。

## Kanji-grade data (漢字利用チェック)

`KYOIKU_KANJI` (grades 1–6, 1026 characters total) was scraped from Japanese Wikipedia's 学年別漢字配当表 article and verified before embedding: exact per-grade counts (80/160/200/202/193/191), all 1026 characters unique, no duplicates. If this table is ever regenerated, re-verify those counts the same way rather than trusting a fresh scrape blindly.
