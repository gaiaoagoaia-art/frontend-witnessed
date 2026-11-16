// format.js — display helpers shared by every view, plus a small safe
// markdown renderer for the descriptions and rules the API returns.

export function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

// Money arrives as a number (250) or a string ("630.50") depending on the
// field; show cents only when the amount has them.
export function usd(value) {
  const n = typeof value === 'string' ? Number.parseFloat(value) : value;
  if (n == null || Number.isNaN(n)) return '—';
  const cents = Math.round(n * 100) % 100 !== 0;
  return '$' + n.toLocaleString('en-US', {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

export function int(value) {
  const n = typeof value === 'string' ? Number.parseFloat(value) : value;
  if (n == null || Number.isNaN(n)) return '—';
  return Math.round(n).toLocaleString('en-US');
}

// Win rates and scores travel as micro units (1,000,000 = 100%).
export function pct(micro) {
  const n = typeof micro === 'string' ? Number.parseFloat(micro) : micro;
  if (n == null || Number.isNaN(n)) return '—';
  return (n / 10000).toFixed(1) + '%';
}

export function sizeFmt(bytes) {
  const n = typeof bytes === 'string' ? Number.parseFloat(bytes) : bytes;
  if (n == null || Number.isNaN(n)) return '—';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1).replace(/\.0$/, '') + ' KB';
  return (n / (1024 * 1024)).toFixed(2).replace(/\.?0+$/, '') + ' MB';
}

export function dateFmt(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const day = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  return day + ' · ' + time + ' UTC';
}

// "2d 4h", "4h 12m", "12m", "3d" — or null once the deadline has passed.
// A bounty can still read status open after its deadline, so this, not the
// status field, decides whether a bounty still takes entries.
export function timeLeft(iso, now = Date.now()) {
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return null;
  let s = Math.floor((end - now) / 1000);
  if (s <= 0) return null;
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60);
  if (d > 0) return h > 0 ? d + 'd ' + h + 'h' : d + 'd';
  if (h > 0) return m > 0 ? h + 'h ' + m + 'm' : h + 'h';
  return Math.max(m, 1) + 'm';
}

export function accepting(bounty, now = Date.now()) {
  if (!bounty || !bounty.deadline) return false;
  return new Date(bounty.deadline).getTime() > now;
}

export function shortWallet(address) {
  if (!address || address.length < 12) return address || '';
  return address.slice(0, 4) + '…' + address.slice(-4);
}

// --- markdown, a small safe subset --------------------------------------
// The text is escaped first; code fences and code spans are lifted out
// before the inline rules run and put back after, so nothing in the source
// can inject markup. Links keep only http(s), root-relative and hash hrefs.

function inline(text) {
  let out = text;
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, url) =>
    isSafeHref(url) ? '<img loading="lazy" alt="' + alt + '" src="' + url + '">' : alt);
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, url) =>
    isSafeHref(url) ? '<a href="' + url + '">' + label + '</a>' : label);
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  return out;
}

function isSafeHref(url) {
  return /^https?:\/\//i.test(url) || url.startsWith('/') || url.startsWith('#');
}

function renderTable(lines) {
  const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  const head = cells(lines[0]);
  const rows = lines.slice(2).map(cells);
  let html = '<div class="tbl-wrap"><table class="tbl"><thead><tr>';
  html += head.map((c) => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>';
  for (const row of rows) {
    html += '<tr>' + head.map((_, i) => '<td>' + inline(row[i] ?? '') + '</td>').join('') + '</tr>';
  }
  return html + '</tbody></table></div>';
}

export function md(source) {
  if (!source) return '';
  const stash = [];
  const keep = (html) => '\u0001' + (stash.push(html) - 1) + '\u0001';
  let text = esc(String(source).replace(/\r\n/g, '\n'));
  text = text.replace(/```[^\n]*\n([\s\S]*?)```/g, (m, code) => keep('<pre><code>' + code.replace(/\n$/, '') + '</code></pre>'));
  text = text.replace(/`([^`\n]+)`/g, (m, code) => keep('<code>' + code + '</code>'));

  const lines = text.split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\u0001\d+\u0001$/.test(line.trim())) { blocks.push(line.trim()); i++; continue; }
    if (!line.trim()) { i++; continue; }
    const head = line.match(/^(#{1,6})\s+(.*)$/);
    if (head) { blocks.push('<h' + head[1].length + '>' + inline(head[2]) + '</h' + head[1].length + '>'); i++; continue; }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { blocks.push('<hr>'); i++; continue; }
    if (line.trim().startsWith('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      const group = [line, lines[i + 1]];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) { group.push(lines[i]); i++; }
      blocks.push(renderTable(group));
      continue;
    }
    if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items = [];
      while (i < lines.length && (/^\s*[-*+]\s+/.test(lines[i]) || /^\s*\d+[.)]\s+/.test(lines[i]))) {
        items.push(lines[i].replace(/^\s*(?:[-*+]|\d+[.)])\s+/, ''));
        i++;
      }
      const tag = ordered ? 'ol' : 'ul';
      blocks.push('<' + tag + '>' + items.map((item) => '<li>' + inline(item) + '</li>').join('') + '</' + tag + '>');
      continue;
    }
    if (/^\s*>\s?/.test(line)) {
      const quoted = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) { quoted.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
      blocks.push('<blockquote>' + inline(quoted.join(' ')) + '</blockquote>');
      continue;
    }
    const para = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,6})\s/.test(lines[i]) && !/^\s*(?:[-*+]|\d+[.)])\s+/.test(lines[i]) && !/^\s*>/.test(lines[i]) && !/^\u0001\d+\u0001$/.test(lines[i].trim())) {
      para.push(lines[i]);
      i++;
    }
    blocks.push('<p>' + inline(para.join(' ')) + '</p>');
  }
  return blocks.join('\n').replace(/\u0001(\d+)\u0001/g, (m, n) => stash[Number(n)]);
}
