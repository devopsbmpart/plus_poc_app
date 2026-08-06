/**
 * 데모용 워크로드 데이터.
 *
 * 시드 기반으로 만든다. 요청마다 값이 흔들리면 화면을 신뢰할 수 없고,
 * 스크린샷을 찍어 비교할 수도 없다. 재시작해도 같은 목록이 나온다.
 * 사용률만 시간에 따라 완만하게 움직인다.
 */

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const NAMES = [
  ['api-gateway', 'core', 'prod'],
  ['auth-service', 'core', 'prod'],
  ['billing-worker', 'billing', 'prod'],
  ['usage-collector', 'billing', 'prod'],
  ['notification-relay', 'core', 'prod'],
  ['report-scheduler', 'analytics', 'stg'],
  ['metrics-aggregator', 'analytics', 'prod'],
  ['image-optimizer', 'media', 'stg'],
  ['search-indexer', 'search', 'prod'],
  ['session-store-proxy', 'core', 'stg'],
  ['audit-shipper', 'security', 'prod'],
  ['policy-evaluator', 'security', 'stg'],
  ['tenant-provisioner', 'platform', 'prod'],
  ['quota-reconciler', 'platform', 'prod'],
  ['webhook-dispatcher', 'core', 'dev'],
  ['log-rotator', 'platform', 'dev'],
];

const IMAGE_TAGS = ['1.14.2', '1.14.1', '2.0.0-rc3', '1.9.8', '3.2.0'];

export const WORKLOADS = NAMES.map(([name, team, env], i) => {
  const rand = seeded(i * 7919 + 13);
  const replicas = 1 + Math.floor(rand() * 5);
  const roll = rand();
  const status = roll > 0.88 ? 'degraded' : roll > 0.78 ? 'updating' : 'running';
  const ready = status === 'degraded' ? Math.max(0, replicas - 1) : replicas;

  return {
    id: `wl-${String(i + 1).padStart(3, '0')}`,
    name,
    team,
    env,
    status,
    replicas,
    ready,
    image: `harbor.internal/${team}/${name}:${IMAGE_TAGS[i % IMAGE_TAGS.length]}`,
    node: `tr-dev-trb-worker-${1 + (i % 5)}`,
    cpuRequest: [100, 200, 250, 500, 1000][i % 5],
    memRequest: [128, 256, 512, 1024][i % 4],
    restarts: status === 'degraded' ? 2 + Math.floor(rand() * 9) : Math.floor(rand() * 2),
    ageHours: 3 + Math.floor(rand() * 900),
    baseCpu: 0.12 + rand() * 0.7,
    baseMem: 0.2 + rand() * 0.65,
  };
});

/** 사용률은 분 단위로 완만하게 움직인다. 새로고침할 때마다 튀지 않는다. */
function drift(base, id, minute) {
  const wave = Math.sin((minute + id * 11) / 9) * 0.07;
  return Math.min(0.98, Math.max(0.02, base + wave));
}

export function snapshot() {
  const minute = Math.floor(Date.now() / 60000);
  return WORKLOADS.map((w, i) => ({
    ...w,
    cpu: Number(drift(w.baseCpu, i, minute).toFixed(3)),
    mem: Number(drift(w.baseMem, i, minute).toFixed(3)),
  })).map(({ baseCpu, baseMem, ...rest }) => rest);
}

export function summary(items) {
  return {
    total: items.length,
    running: items.filter((w) => w.status === 'running').length,
    updating: items.filter((w) => w.status === 'updating').length,
    degraded: items.filter((w) => w.status === 'degraded').length,
    replicas: items.reduce((n, w) => n + w.replicas, 0),
    restarts: items.reduce((n, w) => n + w.restarts, 0),
  };
}
