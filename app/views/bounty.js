// bounty.js — one bounty's page: its summary, description and rules, the
// rewards table at the live pot, its dates and status, and its entries.
// Everything comes from the single detail answer; the entries list pages
// through that same answer in place, with no extra request.

import { api } from '../api.js';
import { accepting, dateFmt, esc, int, md, pct, timeLeft, usd } from '../format.js';

function rewardsTable(bounty) {
  let rows = [];
  if (Array.isArray(bounty.rewardsNow) && bounty.rewardsNow.length) {
    rows = bounty.rewardsNow.map((r) =>
      '<tr><td>' + esc(r.place) + '</td><td>' + esc(usd(r.baseUsd)) + '</td><td>' +
      esc(usd(r.feeShareUsd)) + '</td><td class="num-strong">' + esc(usd(r.amountUsd)) + '</td></tr>');
  } else if (bounty.rewards && typeof bounty.rewards === 'object') {
    rows = Object.entries(bounty.rewards)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([place, amount]) =>
        '<tr><td>' + esc(place) + '</td><td>' + esc(usd(amount)) + '</td><td>—</td><td class="num-strong">' + esc(usd(amount)) + '</td></tr>');
  }
  if (!rows.length) return '';
  return '<h2>Rewards — live pot ' + esc(usd(bounty.potUsd ?? bounty.rewardAmount)) + '</h2>' +
    '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Place</th><th>Base</th><th>Fee share</th><th>Pays now</th></tr></thead>' +
    '<tbody>' + rows.join('') + '</tbody></table></div>' +
    '<p class="fine">Fee shares grow as more entrants pay the entry fee; the pot above is the live figure.</p>';
}

function entryRow(entry) {
  const score = typeof entry.score === 'number' && entry.score > 0
    ? ' · score ' + (entry.score <= 1000000 ? pct(entry.score) : int(entry.score))
    : '';
  return '<li class="entry-row">' +
    '<div><span class="entry-title">' + esc(entry.title || 'Untitled entry') + '</span>' +
    '<span class="entry-meta">by <a href="#/profile/' + esc(encodeURIComponent(entry.hunter ?? '')) + '">' +
    esc(entry.hunter ?? 'unknown') + '</a> · ' + esc(dateFmt(entry.createdAt)) + score + '</span></div>' +
    '<span class="chip">' + esc(entry.status ?? '') + '</span></li>';
}

export async function render(root, { slug, isCurrent }) {
  const bounty = await api('/api/competitions/' + encodeURIComponent(slug));
  if (!isCurrent()) return;
  const open = accepting(bounty);
  const left = open ? timeLeft(bounty.deadline) + ' left' : 'Closed';
  const fee = bounty.entryFeeUsd != null && Number(bounty.entryFeeUsd) > 0
    ? usd(bounty.entryFeeUsd) + ' to enter'
    : 'Free to enter';
  const entries = Array.isArray(bounty.submissions) ? bounty.submissions : [];
  let shown = 20;

  root.innerHTML =
    '<p class="crumbs"><a href="#/">← All bounties</a></p>' +
    '<section class="hero">' +
    '<div class="card-top"><span class="sponsor">' + esc(bounty.sponsor?.name ?? 'make.fun') + '</span>' +
    '<span class="chip">' + esc(bounty.category ?? '') + '</span>' +
    '<span class="chip ' + (open ? 'ok' : 'shut') + '">' + (open ? 'Accepting entries' : 'Entries closed') + '</span></div>' +
    '<h1>' + esc(bounty.title) + '</h1>' +
    (bounty.summary ? '<p class="lede">' + esc(bounty.summary) + '</p>' : '') +
    '<dl class="meta-grid">' +
    '<div><dt>Live pot</dt><dd class="big">' + esc(usd(bounty.potUsd ?? bounty.rewardAmount)) + '</dd></div>' +
    '<div><dt>Base prize</dt><dd>' + esc(usd(bounty.rewardAmount)) + '</dd></div>' +
    '<div><dt>Entry fee</dt><dd>' + esc(fee) + '</dd></div>' +
    '<div><dt>Entries</dt><dd>' + int(bounty.submissionCount) + '</dd></div>' +
    '<div><dt>Opens</dt><dd>' + esc(dateFmt(bounty.opensAt)) + '</dd></div>' +
    '<div><dt>Deadline</dt><dd>' + esc(dateFmt(bounty.deadline)) + ' (' + esc(left) + ')</dd></div>' +
    '</dl>' +
    '<p><a class="cta" href="#/bounty/' + esc(bounty.slug) + '/leaderboard">View the leaderboard →</a></p>' +
    '</section>' +
    '<section class="panel">' + rewardsTable(bounty) + '</section>' +
    (bounty.description
      ? '<section class="panel prose"><h2>About this bounty</h2>' + md(bounty.description) + '</section>'
      : '') +
    (bounty.rules
      ? '<section class="panel prose"><details><summary><h2 class="inline">Full rules</h2></summary>' + md(bounty.rules) + '</details></section>'
      : '') +
    '<section class="panel"><h2>Entries (' + int(entries.length) + ' shown of ' + int(bounty.submissionCount) + ')</h2>' +
    '<ul class="entries" id="bounty-entries"></ul>' +
    '<p class="more-row"><button type="button" id="bounty-more">Show more entries</button></p></section>';

  const list = root.querySelector('#bounty-entries');
  const moreBtn = root.querySelector('#bounty-more');
  function paintEntries() {
    list.innerHTML = entries.length
      ? entries.slice(0, shown).map(entryRow).join('')
      : '<li class="empty">No entries yet.</li>';
    moreBtn.hidden = shown >= entries.length;
  }
  moreBtn.addEventListener('click', () => { shown += 40; paintEntries(); });
  paintEntries();
  window.__shotReady = true;
}
