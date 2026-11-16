// board.js — the bounty board: every live bounty with its live pot, its
// entry fee where one is set, the time it has left and its entry count.
// Pages arrive by cursor, 24 at a time; sorting and filtering act on the
// pages already loaded, and "Load more" appends the next page in place.

import { api } from '../api.js';
import { accepting, esc, int, timeLeft, usd } from '../format.js';

const PAGE = 24;

function potOf(bounty) {
  const pot = Number.parseFloat(bounty.potUsd);
  if (!Number.isNaN(pot) && pot > 0) return pot;
  return bounty.rewardAmount ?? 0;
}

function card(bounty) {
  const open = accepting(bounty);
  const fee = bounty.entryFeeUsd != null && Number(bounty.entryFeeUsd) > 0
    ? '<span class="chip fee">Fee ' + esc(usd(bounty.entryFeeUsd)) + '</span>'
    : '';
  const left = open
    ? '<span class="left" data-deadline="' + esc(bounty.deadline) + '">' + esc(timeLeft(bounty.deadline)) + ' left</span>'
    : '<span class="left closed">Closed — judging</span>';
  return '<article class="card">' +
    '<div class="card-top"><span class="sponsor">' + esc(bounty.sponsor?.name ?? 'make.fun') + '</span>' +
    '<span class="chip">' + esc(bounty.category ?? '') + '</span></div>' +
    '<h2 class="card-title"><a href="#/bounty/' + esc(bounty.slug) + '">' + esc(bounty.title) + '</a></h2>' +
    '<p class="pot">' + esc(usd(potOf(bounty))) + ' <span class="pot-label">live pot</span></p>' +
    '<p class="card-meta">' + int(bounty.submissionCount) + ' entries · base prize ' + esc(usd(bounty.rewardAmount)) + '</p>' +
    '<div class="card-foot">' + left + fee + '</div>' +
    '</article>';
}

function sortItems(items, mode) {
  const list = [...items];
  const byDeadline = (a, b) => new Date(a.deadline) - new Date(b.deadline);
  if (mode === 'ending') {
    list.sort((a, b) => (accepting(b) - accepting(a)) || byDeadline(a, b));
  } else if (mode === 'pot') {
    list.sort((a, b) => potOf(b) - potOf(a));
  } else if (mode === 'entries') {
    list.sort((a, b) => (b.submissionCount ?? 0) - (a.submissionCount ?? 0));
  } else if (mode === 'new') {
    list.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }
  return list;
}

export async function render(root, { isCurrent }) {
  const first = await api('/api/competitions?status=open&limit=' + PAGE);
  if (!isCurrent()) return;
  const state = {
    items: [...(first.items ?? [])],
    cursor: first.next_cursor ?? null,
    sort: 'ending',
    openOnly: false,
    busy: false,
  };

  root.innerHTML =
    '<section class="hero"><h1>The bounty board</h1>' +
    '<p class="lede">Live competitions on make.fun, read straight from the public API. ' +
    'Rewards are live pots: the base prize plus every entry fee paid so far.</p>' +
    '<p class="stats" id="board-stats"></p></section>' +
    '<section class="controls" aria-label="Board controls">' +
    '<label>Sort <select id="board-sort">' +
    '<option value="ending">Ending soon</option>' +
    '<option value="pot">Biggest pot</option>' +
    '<option value="entries">Most entries</option>' +
    '<option value="new">Newest</option>' +
    '</select></label>' +
    '<label class="check"><input type="checkbox" id="board-open"> Accepting entries only</label>' +
    '</section>' +
    '<section class="grid" id="board-grid"></section>' +
    '<p class="more-row"><button type="button" id="board-more">Load more bounties</button></p>';

  const grid = root.querySelector('#board-grid');
  const stats = root.querySelector('#board-stats');
  const moreBtn = root.querySelector('#board-more');

  function paint() {
    let items = sortItems(state.items, state.sort);
    if (state.openOnly) items = items.filter((b) => accepting(b));
    grid.innerHTML = items.length
      ? items.map(card).join('')
      : '<p class="empty">No bounties match. Load more, or clear the filter.</p>';
    const openCount = state.items.filter((b) => accepting(b)).length;
    const potTotal = state.items.reduce((sum, b) => sum + potOf(b), 0);
    stats.textContent = state.items.length + ' bounties loaded · ' + openCount +
      ' accepting entries · ' + usd(potTotal) + ' in live pots';
    moreBtn.hidden = !state.cursor;
    moreBtn.disabled = state.busy;
    moreBtn.textContent = state.busy ? 'Loading…' : 'Load more bounties';
  }

  root.querySelector('#board-sort').addEventListener('change', (event) => {
    state.sort = event.target.value;
    paint();
  });
  root.querySelector('#board-open').addEventListener('change', (event) => {
    state.openOnly = event.target.checked;
    paint();
  });
  moreBtn.addEventListener('click', async () => {
    if (!state.cursor || state.busy) return;
    state.busy = true;
    paint();
    try {
      const page = await api('/api/competitions?status=open&limit=' + PAGE + '&cursor=' + encodeURIComponent(state.cursor));
      state.items.push(...(page.items ?? []));
      state.cursor = page.next_cursor ?? null;
    } finally {
      state.busy = false;
      if (isCurrent()) paint();
    }
  });

  paint();
  window.__shotReady = true;

  // The countdowns tick in place: every 30 seconds only the time-left
  // labels are rewritten, straight from their data-deadline attributes —
  // no refetch, no repaint of the grid. The timer stops itself once the
  // reader has navigated away from the board.
  const timer = setInterval(() => {
    if (!isCurrent()) {
      clearInterval(timer);
      return;
    }
    grid.querySelectorAll('[data-deadline]').forEach((node) => {
      const left = timeLeft(node.dataset.deadline);
      node.textContent = left ? left + ' left' : 'Closed — judging';
      if (!left) node.classList.add('closed');
    });
  }, 30000);
}
