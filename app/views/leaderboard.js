// leaderboard.js — a bounty's ranked entries. The answer can hold
// thousands of rows, so the table paints 100 at a time from the answer
// already in hand; the filter searches those rows locally, and switching
// the board's view is the only action that asks the API again.

import { api } from '../api.js';
import { esc, pct, sizeFmt } from '../format.js';

const PAGE = 100;

function cellValue(entry, column) {
  const raw = entry.values ? entry.values[column.key] : undefined;
  if (raw == null) return '—';
  if (column.key === 'valid') return raw ? '✓' : '—';
  if (column.key === 'bytes') return sizeFmt(raw);
  if ((column.source && column.source.includes('win_rate')) || column.key.startsWith('judge')) return pct(raw);
  if (entry.display && entry.display[column.key] != null) return entry.display[column.key];
  return String(raw);
}

export async function render(root, { slug, isCurrent }) {
  let view = '';
  let data = await api('/api/competitions/' + encodeURIComponent(slug) + '/leaderboard');
  if (!isCurrent()) return;

  root.innerHTML =
    '<p class="crumbs"><a href="#/bounty/' + esc(slug) + '">← Back to the bounty</a></p>' +
    '<section class="hero"><h1 id="lb-title"></h1><p class="lede" id="lb-sub"></p></section>' +
    '<section class="controls" aria-label="Leaderboard controls">' +
    '<span id="lb-views"></span>' +
    '<label>Filter <input type="search" id="lb-filter" placeholder="Handle or title…"></label>' +
    '</section>' +
    '<section class="panel"><div class="tbl-wrap"><table class="tbl" id="lb-table"></table></div>' +
    '<p class="more-row"><button type="button" id="lb-more">Show more rows</button></p></section>';

  const table = root.querySelector('#lb-table');
  const moreBtn = root.querySelector('#lb-more');
  const filterInput = root.querySelector('#lb-filter');
  let shown = PAGE;
  let filter = '';

  function visibleEntries() {
    const all = data.entries ?? [];
    if (!filter) return all;
    const q = filter.toLowerCase();
    return all.filter((e) =>
      (e.handle ?? '').toLowerCase().includes(q) || (e.title ?? '').toLowerCase().includes(q));
  }

  function paint() {
    const columns = (data.columns ?? []).filter((c) => !c.hidden);
    const entries = visibleEntries();
    let html = '<thead><tr><th>#</th><th>Entrant</th>' +
      columns.map((c) => '<th>' + esc(c.title) + '</th>').join('') + '</tr></thead><tbody>';
    if (!entries.length) {
      html += '<tr><td colspan="' + (columns.length + 2) + '" class="empty">No ranked entries match.</td></tr>';
    }
    for (const entry of entries.slice(0, shown)) {
      html += '<tr><td class="num-strong">' + esc(entry.rank ?? '') + '</td>' +
        '<td><a href="#/profile/' + esc(encodeURIComponent(entry.handle ?? '')) + '">' + esc(entry.handle ?? '') + '</a>' +
        '<span class="entry-meta">' + esc(entry.title ?? '') + '</span></td>' +
        columns.map((c) => '<td>' + esc(cellValue(entry, c)) + '</td>').join('') + '</tr>';
    }
    table.innerHTML = html + '</tbody>';
    moreBtn.hidden = shown >= entries.length;
    root.querySelector('#lb-sub').textContent =
      (data.phase?.title ?? '') + ' phase · ' + entries.length + ' ranked entries' +
      (data.metrics_withheld ? ' · some metrics withheld until results' : '');
  }

  function paintViews() {
    const views = data.views ?? [];
    root.querySelector('#lb-views').innerHTML = views.length > 1
      ? views.map((v) =>
          '<button type="button" class="tab' + (v === data.view ? ' on' : '') + '" data-view="' + esc(v) + '">' +
          esc(v) + '</button>').join('')
      : '';
    root.querySelectorAll('#lb-views .tab').forEach((btn) =>
      btn.addEventListener('click', async () => {
        if (btn.dataset.view === data.view) return;
        view = btn.dataset.view;
        data = await api('/api/competitions/' + encodeURIComponent(slug) + '/leaderboard?view=' + encodeURIComponent(view));
        if (!isCurrent()) return;
        shown = PAGE;
        paintViews();
        paint();
      }));
  }

  root.querySelector('#lb-title').textContent = (data.competition?.title ?? slug) + ' — leaderboard';
  filterInput.addEventListener('input', () => { filter = filterInput.value.trim(); shown = PAGE; paint(); });
  moreBtn.addEventListener('click', () => { shown += PAGE; paint(); });
  paintViews();
  paint();
  window.__shotReady = true;
}
