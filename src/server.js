/**
 * 워크로드 콘솔 — 데모 애플리케이션.
 *
 * 의존성 없이 Node 표준 모듈만 쓴다. 컨테이너 이미지를 작게 유지하고
 * 빌드 단계를 하나라도 줄이기 위해서다.
 *
 * 빌드 정보(어느 Jira 이슈·커밋·이미지에서 왔는지)는 환경변수로 주입받아
 * 화면 하단에 조용히 노출한다. 실제 서비스들이 하는 방식과 같다.
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

import { snapshot } from './data.js';

const PORT = Number(process.env.PORT ?? 8080);
const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), 'public');
const STARTED_AT = new Date().toISOString();

/**
 * URL 파싱용 고정 오리진. 요청에서 pathname만 쓰기 때문에 실제 호스트를 반영할 필요가 없고,
 * 클라이언트가 보내는 Host 헤더를 끼워 넣으면 조작된 헤더 하나로 new URL이 던진다.
 */
const INTERNAL_ORIGIN = 'http://localhost';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
};

/** 재시작·스케일 조정 결과를 메모리에 담아둔다. 데모라 영속화하지 않는다. */
const overrides = new Map();

function withOverrides(items) {
  return items.map((w) => ({ ...w, ...(overrides.get(w.id) ?? {}) }));
}

function buildInfo() {
  const repo = process.env.SOURCE_REPO || 'devopsbmpart/plus_poc_app';
  const revision = process.env.GIT_REVISION || null;
  const issue = process.env.JIRA_ISSUE || null;
  const jiraBase = process.env.JIRA_BASE_URL || 'https://okestro.atlassian.net';

  return {
    version: process.env.APP_VERSION || '0.3.0',
    env: process.env.APP_ENV || null,
    jiraIssue: issue,
    jiraUrl: issue ? `${jiraBase}/browse/${issue}` : null,
    revision,
    commitUrl: revision ? `https://github.com/${repo}/commit/${revision}` : null,
    imageDigest: process.env.IMAGE_DIGEST || null,
    startedAt: STARTED_AT,
  };
}

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

async function serveStatic(res, pathname) {
  // 경로 탈출 방지. normalize 후 public 밖으로 나가면 거부한다.
  const rel = normalize(pathname === '/' ? '/index.html' : pathname).replace(/^(\.\.[/\\])+/, '');
  const file = join(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR)) {
    json(res, 403, { error: 'forbidden' });
    return;
  }

  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    json(res, 404, { error: 'not found', path: pathname });
  }
}

function handleAction(res, id, action) {
  const current = withOverrides(snapshot()).find((w) => w.id === id);
  if (!current) {
    json(res, 404, { error: `워크로드를 찾을 수 없습니다: ${id}` });
    return;
  }

  const next = { ...(overrides.get(id) ?? {}) };
  let message;

  if (action === 'restart') {
    next.restarts = current.restarts + 1;
    next.status = 'updating';
    next.ready = Math.max(0, current.replicas - 1);
    next.ageHours = 0;
    message = `${current.name} 재시작을 요청했습니다`;
    // 배포가 끝나는 모습을 흉내낸다. 데모에서 상태가 멈춰 있으면 죽은 화면처럼 보인다.
    setTimeout(() => {
      const done = overrides.get(id) ?? {};
      overrides.set(id, { ...done, status: 'running', ready: done.replicas ?? current.replicas });
    }, 6000);
  } else if (action === 'scale-up') {
    next.replicas = current.replicas + 1;
    next.ready = next.replicas;
    message = `${current.name} 레플리카를 ${next.replicas}개로 늘렸습니다`;
  } else if (action === 'scale-down') {
    if (current.replicas <= 1) {
      json(res, 400, { error: '레플리카를 1개 미만으로 줄일 수 없습니다' });
      return;
    }
    next.replicas = current.replicas - 1;
    next.ready = next.replicas;
    message = `${current.name} 레플리카를 ${next.replicas}개로 줄였습니다`;
  } else {
    json(res, 400, { error: `알 수 없는 동작: ${action}` });
    return;
  }

  overrides.set(id, next);
  json(res, 200, { message, workload: { ...current, ...next } });
}

createServer((req, res) => {
  let url;
  try {
    url = new URL(req.url, INTERNAL_ORIGIN);
  } catch {
    json(res, 400, { error: 'bad request target' });
    return;
  }
  const path = url.pathname;

  if (path === '/healthz' || path === '/readyz') {
    json(res, 200, { ok: true });
    return;
  }
  if (path === '/api/build' || path === '/info') {
    json(res, 200, buildInfo());
    return;
  }
  if (path === '/api/workloads' && req.method === 'GET') {
    json(res, 200, withOverrides(snapshot()));
    return;
  }

  const action = path.match(/^\/api\/workloads\/([\w-]+)\/([\w-]+)$/);
  if (action && req.method === 'POST') {
    handleAction(res, action[1], action[2]);
    return;
  }

  serveStatic(res, path);
}).listen(PORT, () => {
  const info = buildInfo();
  console.log(`워크로드 콘솔 :${PORT}  버전 ${info.version}  이슈 ${info.jiraIssue ?? '-'}`);
});
