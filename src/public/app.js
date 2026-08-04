/**
 * 워크로드 콘솔 프런트.
 * 프레임워크 없이 돌아간다. 컨테이너 하나에 담기는 데모라 빌드 단계를 두지 않았다.
 */

const state = {
  items: [],
  build: null,
  query: '',
  env: 'all',
  status: 'all',
  sort: { key: 'name', dir: 1 },
  selected: null,
  busy: new Set(),
};

const $ = (sel) => document.querySelector(sel);
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const pct = (n) => `${Math.round(n * 100)}%`;
const age = (h) => (h < 24 ? `${h}시간` : `${Math.floor(h / 24)}일`);
const STATUS_LABEL = { running: '정상', updating: '배포 중', degraded: '비정상' };

async function load() {
  const [items, build] = await Promise.all([
    fetch('api/workloads').then((r) => r.json()),
    fetch('api/build').then((r) => r.json()),
  ]);
  state.items = items;
  state.build = build;
  renderAll();
}

function visible() {
  const q = state.query.trim().toLowerCase();
  const rows = state.items.filter(
    (w) =>
      (state.env === 'all' || w.env === state.env) &&
      (state.status === 'all' || w.status === state.status) &&
      (!q || w.name.includes(q) || w.team.includes(q) || w.image.toLowerCase().includes(q)),
  );

  const { key, dir } = state.sort;
  return rows.sort((a, b) => {
    const x = a[key];
    const y = b[key];
    return (typeof x === 'string' ? x.localeCompare(y) : x - y) * dir;
  });
}

function renderMetrics() {
  const s = state.items.reduce(
    (acc, w) => ({
      total: acc.total + 1,
      running: acc.running + (w.status === 'running'),
      updating: acc.updating + (w.status === 'updating'),
      degraded: acc.degraded + (w.status === 'degraded'),
      replicas: acc.replicas + w.replicas,
      restarts: acc.restarts + w.restarts,
    }),
    { total: 0, running: 0, updating: 0, degraded: 0, replicas: 0, restarts: 0 },
  );

  $('#metrics').innerHTML = [
    ['워크로드', s.total, ''],
    ['정상', s.running, ''],
    ['배포 중', s.updating, s.updating ? 'is-upd' : ''],
    ['비정상', s.degraded, s.degraded ? 'is-deg' : ''],
    ['레플리카', s.replicas, ''],
    ['재시작', s.restarts, ''],
  ]
    .map(([label, value, cls]) => `<dl class="metric ${cls}"><dt>${label}</dt><dd>${value}</dd></dl>`)
    .join('');
}

function usageCell(value) {
  return `<div class="usage ${value > 0.85 ? 'hot' : ''}">
    <span class="bar"><i style="width:${(value * 100).toFixed(0)}%"></i></span>
    <span class="val">${pct(value)}</span>
  </div>`;
}

function detailRow(w) {
  const busy = state.busy.has(w.id);
  const fields = [
    ['이미지', w.image],
    ['노드', w.node],
    ['레플리카', `${w.ready} / ${w.replicas}`],
    ['CPU 요청', `${w.cpuRequest}m`],
    ['메모리 요청', `${w.memRequest}Mi`],
    ['재시작', String(w.restarts)],
    ['가동 시간', age(w.ageHours)],
    ['워크로드 ID', w.id],
  ];

  return `<tr class="detail"><td colspan="9"><div class="detail-inner">
    ${fields.map(([k, v]) => `<div class="field"><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}
    <div class="actions">
      <button class="btn primary" data-act="restart" data-id="${w.id}" ${busy ? 'disabled' : ''}>
        ${busy ? '처리 중…' : '재시작'}
      </button>
      <button class="btn" data-act="scale-up" data-id="${w.id}" ${busy ? 'disabled' : ''}>레플리카 +1</button>
      <button class="btn" data-act="scale-down" data-id="${w.id}" ${busy || w.replicas <= 1 ? 'disabled' : ''}>레플리카 −1</button>
    </div>
  </div></td></tr>`;
}

function renderTable() {
  const rows = visible();
  const body = $('#rows');

  if (rows.length === 0) {
    body.innerHTML = `<tr><td colspan="9"><p class="empty">조건에 맞는 워크로드가 없습니다. 검색어나 필터를 바꿔보세요.</p></td></tr>`;
    return;
  }

  body.innerHTML = rows
    .map((w) => {
      const sel = state.selected === w.id;
      return `<tr data-id="${w.id}" aria-selected="${sel}" tabindex="0">
        <td>
          <div class="wl-name">${esc(w.name)}</div>
          <div class="wl-image">${esc(w.image)}</div>
        </td>
        <td class="col-team"><span class="tag">${esc(w.team)}</span></td>
        <td><span class="tag">${esc(w.env)}</span></td>
        <td><span class="state ${w.status}">${STATUS_LABEL[w.status]}</span></td>
        <td class="num">${w.ready}/${w.replicas}</td>
        <td class="num">${usageCell(w.cpu)}</td>
        <td class="num">${usageCell(w.mem)}</td>
        <td class="num col-restarts">${w.restarts}</td>
        <td class="col-node"><span class="tag">${esc(w.node)}</span></td>
      </tr>${sel ? detailRow(w) : ''}`;
    })
    .join('');
}

function renderBuild() {
  const b = state.build;
  if (!b) return;
  const item = (label, value, href) => {
    if (!value) return '';
    const text = esc(value);
    return `<dl><dt>${label}</dt><dd>${href ? `<a href="${esc(href)}" target="_blank" rel="noreferrer noopener">${text}</a>` : text}</dd></dl>`;
  };

  $('#buildbar').innerHTML = [
    item('버전', b.version),
    item('이슈', b.jiraIssue, b.jiraUrl),
    item('커밋', b.revision ? b.revision.slice(0, 7) : null, b.commitUrl),
    item('이미지', b.imageDigest ? b.imageDigest.replace('sha256:', '').slice(0, 12) : null),
    item('기동', new Date(b.startedAt).toLocaleString('ko-KR')),
  ].join('');
}

function renderAll() {
  renderMetrics();
  renderTable();
  renderBuild();
}

function toast(message) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  $('#toasts').append(el);
  setTimeout(() => el.remove(), 3200);
}

async function act(id, action) {
  const w = state.items.find((x) => x.id === id);
  if (!w) return;

  state.busy.add(id);
  renderTable();

  const res = await fetch(`api/workloads/${encodeURIComponent(id)}/${action}`, { method: 'POST' })
    .then((r) => r.json())
    .catch(() => null);

  state.busy.delete(id);

  if (!res || res.error) {
    toast(`${w.name} — 요청을 처리하지 못했습니다`);
    renderTable();
    return;
  }

  Object.assign(w, res.workload);
  renderAll();
  toast(res.message);
}

/* ── 이벤트 ─────────────────────────────── */
$('#search').addEventListener('input', (e) => {
  state.query = e.target.value;
  renderTable();
});

document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    const { filter, value } = chip.dataset;
    state[filter] = value;
    document
      .querySelectorAll(`.chip[data-filter="${filter}"]`)
      .forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    renderTable();
  });
});

document.querySelectorAll('th button[data-key]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.key;
    state.sort = { key, dir: state.sort.key === key ? -state.sort.dir : 1 };
    document.querySelectorAll('th button[data-key]').forEach((b) => b.removeAttribute('data-dir'));
    btn.dataset.dir = state.sort.dir > 0 ? '↑' : '↓';
    renderTable();
  });
});

$('#rows').addEventListener('click', (e) => {
  const button = e.target.closest('button[data-act]');
  if (button) {
    act(button.dataset.id, button.dataset.act);
    return;
  }
  const row = e.target.closest('tr[data-id]');
  if (!row) return;
  state.selected = state.selected === row.dataset.id ? null : row.dataset.id;
  renderTable();
});

// 키보드로 목록을 오갈 수 있게 한다. 하루 종일 보는 화면이라 손이 마우스를 떠나면 안 된다.
$('#rows').addEventListener('keydown', (e) => {
  const row = e.target.closest('tr[data-id]');
  if (!row) return;

  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    state.selected = state.selected === row.dataset.id ? null : row.dataset.id;
    renderTable();
    $(`tr[data-id="${row.dataset.id}"]`)?.focus();
    return;
  }
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;

  e.preventDefault();
  const rows = [...document.querySelectorAll('tr[data-id]')];
  const next = rows[rows.indexOf(row) + (e.key === 'ArrowDown' ? 1 : -1)];
  next?.focus();
});

load();
// 사용률만 주기적으로 갱신한다. 선택 상태와 스크롤은 건드리지 않는다.
setInterval(async () => {
  const items = await fetch('api/workloads').then((r) => r.json()).catch(() => null);
  if (!items) return;
  const busyOrSelected = state.busy.size > 0;
  if (busyOrSelected) return;
  state.items = items;
  renderAll();
}, 15000);
