// main.js — the router, and the whole of the first load besides the
// stylesheet and the two shared helpers. Each surface is its own module,
// fetched with import() only when its route is opened, so the board's
// first paint carries none of the other views' weight.

const view = document.getElementById('view');
let navSeq = 0;

function parseRoute() {
  const hash = location.hash.replace(/^#/, '');
  const parts = hash.split('/').filter((p) => p !== '');
  if (parts.length === 0) return { name: 'board' };
  if (parts[0] === 'bounty' && parts[1] && parts.length === 2) {
    return { name: 'bounty', slug: decodeURIComponent(parts[1]) };
  }
  if (parts[0] === 'bounty' && parts[1] && parts[2] === 'leaderboard' && parts.length === 3) {
    return { name: 'leaderboard', slug: decodeURIComponent(parts[1]) };
  }
  if (parts[0] === 'profile' && parts[1] && parts.length === 2) {
    return { name: 'profile', id: decodeURIComponent(parts[1]) };
  }
  return { name: 'missing' };
}

const TITLES = {
  board: 'make.fun — bounty board',
  bounty: 'make.fun — bounty',
  leaderboard: 'make.fun — leaderboard',
  profile: 'make.fun — profile',
  missing: 'make.fun — not found',
};

async function navigate() {
  const route = parseRoute();
  const seq = ++navSeq;
  const isCurrent = () => seq === navSeq;
  window.__shotReady = false;
  document.title = TITLES[route.name];
  view.innerHTML = '<p class="loading">Loading live data from make.fun…</p>';
  try {
    if (route.name === 'board') {
      const mod = await import('./views/board.js');
      if (isCurrent()) await mod.render(view, { isCurrent });
    } else if (route.name === 'bounty') {
      const mod = await import('./views/bounty.js');
      if (isCurrent()) await mod.render(view, { slug: route.slug, isCurrent });
    } else if (route.name === 'leaderboard') {
      const mod = await import('./views/leaderboard.js');
      if (isCurrent()) await mod.render(view, { slug: route.slug, isCurrent });
    } else if (route.name === 'profile') {
      const mod = await import('./views/profile.js');
      if (isCurrent()) await mod.render(view, { id: route.id, isCurrent });
    } else {
      view.innerHTML = '<section class="panel"><h1>Nothing here</h1>' +
        '<p>That address does not name a surface of this site. ' +
        '<a href="#/">Go to the bounty board</a>.</p></section>';
      window.__shotReady = true;
    }
  } catch (err) {
    if (!isCurrent()) return;
    const gone = err && err.status === 404;
    view.innerHTML = '<section class="panel"><h1>' + (gone ? 'Not found' : 'Could not load that') + '</h1>' +
      '<p>' + (gone
        ? 'make.fun has nothing at that address. <a href="#/">Go to the bounty board</a>.'
        : 'The live API did not answer in a usable way. Check your connection and <a href="' + location.hash + '" onclick="location.reload()">reload</a>.') +
      '</p></section>';
    window.__shotReady = true;
  }
}

document.getElementById('jump').addEventListener('submit', (event) => {
  event.preventDefault();
  const q = new FormData(event.target).get('q');
  const handle = String(q ?? '').trim().replace(/^@/, '');
  if (handle) location.hash = '#/profile/' + encodeURIComponent(handle);
});

window.addEventListener('hashchange', navigate);
navigate();
