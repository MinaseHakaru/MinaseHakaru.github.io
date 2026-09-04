/* 道具帖 — 複数のツールページが実際に共有するものだけを置く。
   各ツール固有の計算・変換ロジックはそのツールのHTMLに残す（CLAUDE.md 参照）。 */
(function(global){
  "use strict";

  let toastEl = null;
  function showToast(msg){
    if (!toastEl) toastEl = document.getElementById('toast');
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(()=> toastEl.classList.remove('show'), 1600);
  }
  async function copyText(text){
    try{ await navigator.clipboard.writeText(text); showToast('コピーしました'); }
    catch(e){ showToast('コピーに失敗しました'); }
  }
  function fmtNum(n){ return n.toLocaleString('ja-JP'); }
  function escapeHtml(s){
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  /* ===================== 原稿用紙レイアウト (共有) =====================
     layoutGenkou() is writing-direction-agnostic: it only tracks position
     within a 20-cell "line" and hands back a flat per-sheet cell array.
     For 縦書き, each "line" is rendered as one column (top-to-bottom), so
     head-of-line kinsoku here is head-of-column, and tail-of-line kinsoku
     is tail-of-column — the same algorithm serves both without change. */
  const KINSOKU_HEAD_FORBID = new Set(['。','、','，','．','）','」','』','】','〉','》','・','！','？','ー','々','ゝ','ゞ','ぁ','ぃ','ぅ','ぇ','ぉ','ゃ','ゅ','ょ','っ',')',']','}',',','.']);
  const GENKOU_OPEN_BRACKETS = new Set(['「','『','（','〈','《','【','［']);
  const GENKOU_COLS = 20, GENKOU_ROWS = 20, GENKOU_PER_SHEET = GENKOU_COLS * GENKOU_ROWS;

  function layoutGenkou(text){
    const sheets = [[]];
    let cur = sheets[0];
    let col = 0;
    let lastCell = null;
    function newSheetIfNeeded(){
      if (cur.length >= GENKOU_PER_SHEET){ cur = []; sheets.push(cur); }
    }
    function placeBlank(){
      newSheetIfNeeded();
      const cell = {main:null, trail:null};
      cur.push(cell);
      lastCell = cell;
      col = (col+1) % GENKOU_COLS;
    }
    function placeChar(ch){
      if (col === 0 && KINSOKU_HEAD_FORBID.has(ch) && lastCell && lastCell.main && !lastCell.trail){
        lastCell.trail = ch;
        return;
      }
      // Tail-of-line kinsoku: don't let an opening bracket sit alone as the
      // last cell of a line — pad the line and push it to the next one.
      if (col === GENKOU_COLS - 1 && GENKOU_OPEN_BRACKETS.has(ch)){
        placeBlank();
      }
      newSheetIfNeeded();
      const cell = {main: ch, trail: null};
      cur.push(cell);
      lastCell = cell;
      col = (col+1) % GENKOU_COLS;
    }
    const paragraphs = text.split('\n');
    paragraphs.forEach((para, pIdx) => {
      if (pIdx > 0) while (col !== 0) placeBlank();
      const chars = Array.from(para);
      if (chars.length > 0 && (chars[0] === '　' || chars[0] === ' ')){
        chars.shift();
      }
      if (!(chars.length > 0 && GENKOU_OPEN_BRACKETS.has(chars[0]))){
        placeBlank();
      }
      for (const ch of chars) placeChar(ch);
    });
    return sheets;
  }

  /* ===================== nav ===================== */
  /* モバイル幅ではツールナビが1行の横スクロールになるため、現在のツールが
     画面外にあると自分の居場所が見えない。読み込み時に見える位置へ寄せる。 */
  function scrollNavToActive(){
    const navEl = document.querySelector('nav.tool-links');
    const activeLink = document.querySelector('nav.tool-links a.active');
    if (!navEl || !activeLink) return;
    const navRect = navEl.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();
    if (linkRect.left < navRect.left) navEl.scrollLeft -= (navRect.left - linkRect.left) + 12;
    else if (linkRect.right > navRect.right) navEl.scrollLeft += (linkRect.right - navRect.right) + 12;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scrollNavToActive);
  else scrollNavToActive();

  global.Toolbox = {
    showToast, copyText, fmtNum, escapeHtml,
    layoutGenkou, KINSOKU_HEAD_FORBID, GENKOU_OPEN_BRACKETS,
    GENKOU_COLS, GENKOU_ROWS, GENKOU_PER_SHEET
  };
})(window);
