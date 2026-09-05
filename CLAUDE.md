# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

A small Japanese-language static site ("道具帖") of self-contained web tools, served from GitHub Pages at the domain root (the repo is `MinaseHakaru.github.io`). No build system, no package manager, no test suite, no dependencies beyond a Google Fonts stylesheet link.

Until 工程7 the whole site was a single `index.html` with a hash router (`#/count` 等). It is now a multi-page site where each tool has a real URL:

```
/index.html                                     トップ（リンク集）
/404.html
/assets/style.css                               全ページ共通のCSS
/assets/common.js                               複数ページが実際に共有するJSだけ
/tools/writing/character-count/index.html       文字数カウント
/tools/writing/width-converter/index.html       全角⇔半角変換
/tools/writing/kana-romaji/index.html           かな⇔ローマ字変換
/tools/writing/manuscript-paper/index.html      原稿用紙エディタ
/tools/writing/kanji-check/index.html           漢字利用チェック
/tools/numbers/number-comparison/index.html     数くらべ
/tools/numbers/real-value/index.html            実質値
```

`/tools/`, `/tools/writing/`, `/tools/numbers/` に `index.html` は置かない。GitHub Pages はディレクトリ一覧を返さないのでこれらは404になる。これは意図した状態であり、空のカテゴリページを先回りして作らない（ROADMAP §4 7番目）。ローカルの `python3 -m http.server` はディレクトリ一覧を返すため、この1点だけ本番と挙動が違う。

## Working with this codebase

There is no build/lint/test tooling. To develop:

- Edit the `.html` / `.css` / `.js` files directly.
- **Preview with a static server rooted at the repository root**, e.g. `python3 -m http.server <port>` from this directory, then open `http://localhost:<port>/`. All internal links and asset references are root-absolute (`/assets/style.css`, `/tools/writing/...`), so **opening a file directly via `file://` no longer works** — that was a property of the single-file era and is intentionally gone. Local verification is now "run the site as a site".
- Verify behavior by driving the page's own JS state (`document.getElementById(...).value = ...; el.dispatchEvent(new Event('input'))`, then read the resulting DOM/state back) rather than trusting a screenshot alone — screenshots in this environment have shown stale/cached renders.
- Every page must start with `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8">…`. Omitting the charset meta tag breaks encoding detection — an earlier version that started straight from `<title>` with no charset declaration was confirmed to render as mojibake in Safari.

## Architecture

**Per-tool pages, shared assets.** Each tool is one `index.html` under its own real URL, containing that tool's markup, its tool-specific JS (calculation/conversion logic, and any static data such as the kanji-grade table) as an inline `<script>`, and nothing else. Two files are shared by every page:

- `/assets/style.css` — all CSS for the whole site, including per-tool styles. One place to change the palette.
- `/assets/common.js` — **only what more than one page actually uses.** `window.Toolbox` として公開しているのは `showToast` / `copyText` / `fmtNum` / `escapeHtml` / `layoutGenkou`（＋禁則定数と `GENKOU_COLS`・`GENKOU_ROWS`・`GENKOU_PER_SHEET`）。ほかに `scrollNavToActive()` を内部に持ち、読み込み時に自動実行する（モバイル幅の1行横スクロールナビで、現在のツールが画面外にあると自分の居場所が見えないため、見える位置へ寄せる）。こちらは公開していない。

Each tool page consumes them like this, so the tool's own code stays byte-identical to what it was in the single-file era:

```html
<script src="/assets/common.js"></script>
<script>
(function(){
  "use strict";
  const { copyText, fmtNum, layoutGenkou } = window.Toolbox;
  /* …そのツール専用のコード… */
})();
</script>
```

**この境界は意図的である。** ツール固有の計算・変換ロジックを `common.js` へ移さないこと。逆に、複数ページが同じロジックを持つ状態も作らないこと。`layoutGenkou()` が共通側にあるのは、文字数カウント（原稿用紙の枚数）と原稿用紙エディタの両方が使っており、禁則や原稿用紙仕様を直すたびに同期漏れの危険が出るため。判断基準は「実際に2ページ以上が使っているか」の一点。

**Element IDs are prefixed per tool** (`cnt-`, `zh-`, `kn-`, `gk-`, `kj-`, `rt-`, `rv-`)。ページが分かれた今も接頭辞は維持する（CSSが全ページ共通なため、また `rt-` のように過去の名残を含むIDを安定させておくため）。なお 数くらべ の要素ID接頭辞 `rt-` は旧名「割合・増減率」の名残で、表示名やURL（`number-comparison`）とは一致しない。壊す理由がないので据え置いている。

**結果の表示は共有クラスを使う。** 結果の文章枠・注記・値なしのダッシュは、数字ツールで共通の見た目になる。`.result-sentence` / `.result-sentence-label` / `.result-note` / `.val-dash` を使うこと。数くらべの `.rt-sentence` などは同じ定義を共有する別名として残してあるだけで、新しいツールでは使わない。

**説明ブロックは `.tool-doc` の4部構成。** 数字ツールは本体の下に `使い方 → 計算の考え方 → 例 → 注意` を置く（実質値が最初の実装で、以後の型になる）。`計算の考え方` には `.formula` で式そのものを出す。個別の統計や制度の解説ページにはしない — 外部の一次情報へのリンクで逃がす。

**Tools do not share input state with each other.** ページが分かれたので構造的にも共有されない。各ツールが自分の入力欄（テキストツールは `<textarea>`、数くらべは number 入力）を持つ。

**旧ハッシュURLの互換転送。** `index.html` に6件のマップ（`count`/`zenhan`/`kana`/`genkou`/`kanji`/`ratio` → 各実URL）を置き、`location.replace()` で転送する。`hashchange` にも同じ処理を張ってある。期限は設けない — 維持コストがほぼゼロで、壊す理由がないため。**新しいツールにハッシュ形式のURLを与えないこと。** このマップは過去の6件だけのためにある。

**時点依存のデータをサイト内に持たない。** これは「入力を外に出さない」と並ぶ設計の柱で、ROADMAP §5・§6・§4 8番目に根拠がある。為替レート、タイムゾーンのオフセット表、消費者物価指数の系列——いずれも自前で抱えると、更新が止まった瞬間に「静かに間違ったサイト」になる。実質値ツールが物価データを持たず、利用者が入力した率だけで計算するのはこのためである。委ね先がある場合はブラウザの標準API（時差なら `Intl.DateTimeFormat`）に完全に委ね、委ね先がない場合はデータを持たずに一次情報へのリンクで逃がす。**新しいツールに「最新の実績値」をプリセットとして埋め込まないこと。** ボタン一つで入る値は、利用者には「このサイトが正しいと言っている値」に見える。

**No network requests beyond fonts.** 唯一許可される外部リクエストは Google Fonts のスタイルシートのみ。それ以外は何も取得せず、利用者の入力はどこにも送らない。ユーザーへの説明は「入力文章は送信されません」と書く。「完全にローカルで動作」とは書かない — Google Fonts の取得は実際にネットワーク通信であり、強い主張のほうは不正確になる。

**CSSの落とし穴が二つある。** どちらも実際に踏んだ。

1. `@media` はセレクタの詳細度を上げない。同じ詳細度なら**後ろに書いたルールが勝つ**ため、狭い幅用の上書きは、対象の基本ルールより**後ろ**に置く。`/assets/style.css` は「共通 → 各ツール」の順に並んでいるので、ツール固有のメディアクエリはそのツールのセクション末尾に書くこと（共通の `@media (max-width: 520px)` ブロックに足すと、後続のツール基本ルールに負けて効かない）。
2. `hidden` 属性は `display` を持つクラスに負ける。`.rv-fields{ display: flex }` のような指定があると `hidden` が効かない。`[hidden]{ display: none !important; }` を先頭付近で全体に効かせてあるので、この規則は消さないこと。JSで `el.hidden` を切り替えている箇所はすべてこれに依存している。

**Design tokens** are CSS custom properties on `:root` in `/assets/style.css`, redefined for dark mode via `@media (prefers-color-scheme: dark)` guarded with `:root:not([data-theme="light"])`, and again under `:root[data-theme="dark"]` for an explicit override (there is no theme-toggle UI yet — theme currently follows the OS only). Reuse these exact values for new tools rather than inventing a new palette:

```
--bg #F4F5F2   --surface #FFFFFF   --surface-sunken #ECEFEC
--ink #1D2422  --ink-soft #5C6B67  --ink-faint #8B9793
--accent #2C5F5E  --accent-strong #1B4443  --accent-soft #DFEBE8
--line #DBE1DD  --line-strong #C3CCC7  --warn #A6572B
```
(dark-mode equivalents are defined alongside each block; `--g1`…`--g6` / `--gx` are grade-highlight colors used only by 漢字利用チェック.)

Typography: **Shippori Mincho** (serif — branding mark, tool titles), **Zen Kaku Gothic New** (body/UI text), **JetBrains Mono** (numbers/stats, anything using `font-variant-numeric: tabular-nums`), loaded from Google Fonts with real fallback stacks. All UI copy is Japanese.

**Per-page titles and descriptions.** 各ページが固有の `<title>`（`"ツール名 | 道具帖"`、トップは `"道具帖"`）と `<meta name="description">` を持つ。descriptionはそのツールが何を測る/変換するかと、入力が送信されないことに触れる1文。404だけはdescriptionを持たない。

## ツールを追加する手順

ビルドがないため、ヘッダーナビとフッターは全8ファイルに重複している。新しいツールを追加するときは：

1. `/tools/<カテゴリ>/<スラッグ>/index.html` を作る（既存ツールのページをひな形にする）。スラッグは英語で、表示名が変わっても意味がずれにくいものにする。
2. **全ページ**（トップ・6ツール・404）の `nav.tool-links` に1行足す。現在のページのリンクにだけ `class="active"` を付ける。
3. トップページ `#view-cover` の該当 `.cover-group` に `.tool-card` を足す。
4. そのページ固有の `<title>` と `<meta name="description">` を書く。
5. ツール固有のCSSは `/assets/style.css` の末尾付近にセクションコメント付きで足す。
6. 2ページ目が同じロジックを使い始めたときだけ、それを `/assets/common.js` へ移す。

## サイト名の階層とカテゴリ見出し

サイト名は「道具帖」(ヘッダーのロゴ・トップページの見出し・`<title>` の既定値)。その下にツールをまとめるカテゴリが並ぶ: 文章づくり道具帖(文字数カウント・全角⇔半角変換・かな⇔ローマ字変換・原稿用紙エディタ・漢字利用チェック)、数字を読み解く(数くらべ)、時間を見渡す(現時点で公開ツールなし)。「文章づくり道具帖」は旧サイト名をそのままカテゴリ名として据え置いたもの。

- トップページ(`#view-cover`)はカテゴリごとに `.cover-group` で分け、各グループの先頭に `.cover-group-heading` を置く。この見出しは意図的に非インタラクティブ — リンクにせず、タブ・折り畳み・選択式UIにもしない。見た目も `.stat-group h2` や `.rt-sentence-label` と同じ「静かな小見出し」系統(0.72rem・太字・字間広め・`--ink-faint`・背景/枠なし)を流用し、階層が大げさに見えないようにしている。
- 個別ツールページの `.tool-header` にも所属カテゴリを `<p class="category">` として表示する(「← 道具帖トップ」とh2見出しの間)。こちらもリンクにしない — カテゴリ専用ページがまだ存在せず、押せる要素にすると遷移先と表示が食い違うため。
- 「時間を見渡す」はツールが1つもないため、DOM上にも一切出力していない(Coming soon等のプレースホルダーも出さない)。`index.html` の `#view-cover` 内にコメントで理由を残している。このカテゴリに最初のツールを追加する時点で `.cover-group` を1つ追加すること。
- URLはカテゴリ階層を含むが(`/tools/writing/...`)、ヘッダーナビは6ツールを平置きしたまま。**URLの階層化とナビの階層化は別の判断**であり、ナビのカテゴリ化はROADMAP §4 6番目の導入条件を満たすまで行わない。

## 原稿用紙エディタ (縦書き)

原稿用紙エディタは縦書き専用。横書きモードは廃止済みで、切り替え機能は設けていない(参考にしたサイトが縦書きだったため、横書きは実装時に落ちた未達仕様だった経緯はROADMAP.mdを参照)。

- `layoutGenkou()` は `/assets/common.js` にあり、書字方向に依存しない。「20マスの行」内の位置(`col`)としてしか位置を追跡せず、シートごとのフラットな `{main, trail}` セル配列を返すだけなので、横書き・縦書きどちらの描画にも同じ関数をそのまま使える。縦書きでは「行頭」=列の最上部、「行末」=列の最下部として同じ禁則ロジック(`KINSOKU_HEAD_FORBID` の行頭ぶら下げ、開きかっこの行末禁則による改行送り)が働く。文字数カウントの原稿用紙枚数も同じ関数で計算している。
- 描画(`initGenkou()` の `render()`)は `.gk-grid` に `grid-auto-flow: column` を使い、`layoutGenkou()` が返すフラット配列をそのままDOM出現順で流し込むだけで列優先(上→下→次の列)の配置になる。列の並び順(1列目が右)は `.gk-scroll`(`.gk-grid` の親)に `direction: rtl` を掛けることで実現しており、同時にこれにより `scrollLeft = 0` が「右端(1列目が見える位置)」を意味するようになる — 初期表示・ページ送り時に右端へ戻す処理は単に `scrollLeft = 0` を代入するだけでよい。
- 用紙(`.gk-grid`)は `width:100%; min-width:400px; max-width:640px; aspect-ratio:1;` でマスサイズ20〜32pxの範囲に収まるようレスポンシブに拡縮する。`.gk-scroll` が `overflow-x:auto` を持つため、コンテナ幅が400px未満になっても用紙自体は縮まず、横スクロールで対応する(ページ全体の縦スクロールには影響しない)。
- 約物の見た目は文字ごとに分類してCSSクラスを振ることで制御している(`classifyGlyph()`)。`gk-corner`(読点・句点・小書き仮名 → マス右上に小さく配置)、`gk-rotate`(長音符ー・ダッシュ— → `writing-mode:horizontal-tb` + `transform:rotate(90deg)` で強制的に縦線化)、`gk-upright`(？！ → `writing-mode:horizontal-tb` のみで回転させない)。開きかっこ類は明示クラスを持たせず、`writing-mode:vertical-rl` のデフォルトの縦書きグリフ変形に委ねている。
- 印刷はA4縦・1ページ1枚。印刷用CSSは `/assets/style.css` の `@media print` にある。

## Kanji-grade data (漢字利用チェック)

`KYOIKU_KANJI` (grades 1–6, 1026 characters total) lives inline in `/tools/writing/kanji-check/index.html`. It was scraped from Japanese Wikipedia's 学年別漢字配当表 article and verified before embedding: exact per-grade counts (80/160/200/202/193/191), all 1026 characters unique, no duplicates. If this table is ever regenerated, re-verify those counts the same way rather than trusting a fresh scrape blindly. (The same counts were re-verified after the 工程7 page split.)
