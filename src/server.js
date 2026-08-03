// 체인 검증용 최소 서비스.
// 배포된 결과물이 "어느 Jira 이슈에서 출발했는지"를 스스로 화면에 보여준다.
// 이 화면이 뜬다는 것 = Jira → GitHub → Actions → 이미지 → GitOps → Argo CD 가
// 전부 이어졌다는 뜻이다.
import { createServer } from 'node:http';

const port = Number(process.env.PORT ?? 8080);

const info = () => ({
  service: 'plus-poc-app',
  jiraIssue: process.env.JIRA_ISSUE || null,
  revision: process.env.GIT_REVISION || null,
  imageDigest: process.env.IMAGE_DIGEST || null,
  startedAt: new Date().toISOString(),
});

function row(label, value, mono = false) {
  const shown = value ?? '<span class="none">전달되지 않음</span>';
  return `<tr><th>${label}</th><td class="${mono ? 'mono' : ''}">${shown}</td></tr>`;
}

function page() {
  const d = info();
  const linked = Boolean(d.jiraIssue);
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>plus-poc-app — 배포 확인</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, "Apple SD Gothic Neo", sans-serif;
         margin: 0; display: grid; place-items: center; min-height: 100vh;
         background: Canvas; color: CanvasText; }
  .card { width: min(560px, 92vw); border: 1px solid color-mix(in srgb, CanvasText 15%, transparent);
          border-radius: 14px; padding: 28px 30px; }
  h1 { margin: 0 0 4px; font-size: 20px; letter-spacing: -.01em; }
  .sub { margin: 0 0 22px; font-size: 13px; opacity: .65; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px;
           font-weight: 600; margin-bottom: 18px; }
  .ok { background: #0a7f3f22; color: #0a7f3f; }
  .warn { background: #96690022; color: #966900; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th { text-align: left; font-weight: 500; opacity: .6; padding: 9px 0; width: 34%;
       border-top: 1px solid color-mix(in srgb, CanvasText 10%, transparent); }
  td { padding: 9px 0; border-top: 1px solid color-mix(in srgb, CanvasText 10%, transparent);
       word-break: break-all; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; }
  .none { opacity: .4; font-style: italic; }
  .chain { margin-top: 22px; font-size: 12px; opacity: .55; line-height: 1.7; }
</style></head>
<body><div class="card">
  <h1>plus-poc-app</h1>
  <p class="sub">DevOps 플랫폼 연동 PoC — 배포 대상 애플리케이션</p>
  <span class="badge ${linked ? 'ok' : 'warn'}">${
    linked ? `상관관계 키 연결됨 · ${d.jiraIssue}` : '상관관계 키 없음'
  }</span>
  <table>
    ${row('Jira Issue', d.jiraIssue)}
    ${row('Git Revision', d.revision, true)}
    ${row('Image Digest', d.imageDigest, true)}
    ${row('기동 시각', d.startedAt, true)}
  </table>
  <p class="chain">Jira → GitHub PR → Actions 빌드 → 이미지 digest → GitOps 커밋 → Argo CD 배포<br>
  이 화면이 보인다는 것은 위 체인이 끝까지 이어졌다는 뜻입니다.</p>
</div></body></html>`;
}

createServer((req, res) => {
  if (req.url === '/healthz') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  if (req.url === '/info') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(info(), null, 2));
    return;
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(page());
}).listen(port, () => console.log(`listening on ${port}`));
