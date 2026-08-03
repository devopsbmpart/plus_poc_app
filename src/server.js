// 체인 검증용 최소 서비스. 배포된 것이 어느 이슈에서 왔는지 스스로 보고한다.
import { createServer } from 'node:http';

const port = Number(process.env.PORT ?? 8080);

createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.url === '/healthz') {
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  res.end(
    JSON.stringify({
      service: 'plus-poc-app',
      jiraIssue: process.env.JIRA_ISSUE ?? null,
      revision: process.env.GIT_REVISION ?? null,
    }),
  );
}).listen(port, () => console.log(`listening on ${port}`));
