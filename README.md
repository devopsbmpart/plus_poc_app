# plus_poc_app — PoC 대상 애플리케이션

DevOps 플랫폼 연동 PoC에서 **자동화를 당하는 쪽**이다.
플랫폼(`plus_poc`)이 Jira 이슈를 받아 이 저장소에 브랜치와 Draft PR을 만들고,
push 가 발생하면 Actions 가 이미지를 빌드해 digest 를 남긴다.

## 체인에서의 위치

```
Jira TPS-456 → [이 저장소] 브랜치·PR·빌드·이미지 → plus_poc_gitops → Argo CD
```

## 상관관계 키

Jira Issue Key 가 아래 경로로 전파된다.

| 위치 | 형태 |
|---|---|
| 브랜치 | `feature/TPS-456` |
| 커밋 trailer | `TPS-456` |
| PR 제목 | `[TPS-456] ...` |
| 이미지 라벨 | `jira.issue=TPS-456` |
| 이미지 라벨 | `org.opencontainers.image.revision=<sha>` |

애플리케이션 자체는 의도적으로 최소한이다. 검증 대상은 앱이 아니라 체인이다.
