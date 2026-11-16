// profile.js — an account's public profile: who they are, their record
// across every bounty they have entered, and the entries themselves,
// each linking back to its bounty.

import { api, assetUrl } from '../api.js';
import { dateFmt, esc, int, pct, shortWallet, usd } from '../format.js';

function solutionRow(solution) {
  const comp = solution.competition ?? {};
  let result = 'Entered ' + dateFmt(solution.entered_at);
  if (solution.placement != null) result = 'Placed #' + solution.placement;
  else if (solution.score && typeof solution.score.value === 'number') {
    result = solution.score.column?.title + ' ' +
      (solution.score.value <= 1000000 ? pct(solution.score.value) : int(solution.score.value));
  }
  const prize = solution.prize_usd ? ' · won ' + usd(solution.prize_usd) : '';
  return '<li class="entry-row"><div>' +
    '<span class="entry-title">' + esc(solution.title || 'Untitled entry') + '</span>' +
    '<span class="entry-meta">in <a href="#/bounty/' + esc(comp.slug ?? '') + '">' + esc(comp.title ?? comp.slug ?? '') +
    '</a> · ' + esc(result) + esc(prize) + '</span></div>' +
    '<span class="chip">' + esc(comp.status ?? '') + '</span></li>';
}

export async function render(root, { id, isCurrent }) {
  const profile = await api('/api/profiles/' + encodeURIComponent(id));
  if (!isCurrent()) return;
  const name = profile.display_name || profile.handle;
  const avatar = assetUrl(profile.avatar?.url || profile.image);
  const record = profile.record ?? {};
  const socials = [
    profile.github_login ? 'GitHub @' + profile.github_login : '',
    profile.discord ? 'Discord ' + profile.discord : '',
    profile.x ? 'X @' + profile.x : '',
  ].filter(Boolean);
  const solutions = Array.isArray(profile.solutions) ? profile.solutions : [];

  root.innerHTML =
    '<p class="crumbs"><a href="#/">← All bounties</a></p>' +
    '<section class="hero profile-head">' +
    (avatar ? '<img class="avatar" crossorigin="anonymous" src="' + esc(avatar) + '" alt="">' : '') +
    '<div><h1>' + esc(name) + '</h1>' +
    '<p class="lede">@' + esc(profile.handle) + ' · joined ' + esc(dateFmt(profile.joined_at)) + '</p>' +
    (profile.bio ? '<p>' + esc(profile.bio) + '</p>' : '') +
    '<p class="card-meta">' +
    (profile.house ? '<span class="chip">House</span> ' : '') +
    (socials.length ? esc(socials.join(' · ')) + ' · ' : '') +
    (profile.wallet?.address
      ? 'Wallet ' + esc(shortWallet(profile.wallet.address)) +
        (profile.wallet.explorer_url ? ' · <a href="' + esc(profile.wallet.explorer_url) + '">explorer</a>' : '')
      : '') +
    '</p></div></section>' +
    '<section class="panel"><h2>Record</h2><dl class="meta-grid">' +
    '<div><dt>Entered</dt><dd class="big">' + int(record.competitions_entered) + '</dd></div>' +
    '<div><dt>Placed</dt><dd>' + int(record.competitions_placed) + '</dd></div>' +
    '<div><dt>Won</dt><dd>' + int(record.competitions_won) + '</dd></div>' +
    '<div><dt>Podiums</dt><dd>' + int(record.podium_finishes) + '</dd></div>' +
    '<div><dt>Best placement</dt><dd>' + (record.best_placement != null ? '#' + int(record.best_placement) : '—') + '</dd></div>' +
    '<div><dt>Prizes</dt><dd>' + esc(usd(record.prize_usd)) + '</dd></div>' +
    '</dl></section>' +
    '<section class="panel"><h2>Entries (' + int(solutions.length) + ')</h2>' +
    '<ul class="entries">' +
    (solutions.length ? solutions.map(solutionRow).join('') : '<li class="empty">No entries yet.</li>') +
    '</ul></section>';
  window.__shotReady = true;
}
