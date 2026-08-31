# PR 플로우 검증 기록

이 문서는 `devopsbmpart/plus_poc_app` 저장소의 PR 생성 경로를 실제로 통과시켜 확인하기 위한 **테스트 산출물**입니다. 애플리케이션 동작에 영향을 주는 코드는 포함하지 않습니다.

## 검증 목적

`main` 브랜치로 향하는 PR이 다음 조건에서 정상 동작하는지 확인합니다.

- 저장소 소유 계정(`devopsbmpart`)의 자격증명으로 브랜치 push가 성공하는가
- 커밋 author가 의도한 계정으로 기록되는가
- PR 생성 시 base/head 브랜치가 올바르게 연결되는가
- 문서 전용 변경이 어떤 CI 워크플로우를 트리거하는가

## 환경

| 항목 | 값 |
|---|---|
| 대상 저장소 | `devopsbmpart/plus_poc_app` |
| base 브랜치 | `main` |
| 커밋 identity | `devopsbmpart <devopsbmpart@users.noreply.github.com>` |
| identity 적용 범위 | 해당 클론의 `.git/config` (로컬 전용) |
| 자격증명 저장 | 없음 — 일회성 credential helper, keychain/디스크 미기록 |

## 확인된 CI 트리거

`.github/workflows/build.yml` 은 `push` 트리거에 브랜치 필터 `**` 만 두고 `paths-ignore` 가 없습니다.

```yaml
on:
  push:
    branches: ['**']
```

따라서 **이 문서 한 개만 추가하는 커밋도 GHCR 이미지 빌드 잡을 전부 실행시킵니다.** 소스가 바뀌지 않았으므로 산출 이미지는 직전 빌드와 동일한 내용이며, 러너 시간만 소비합니다.

개선안(이 PR 범위 아님):

```yaml
on:
  push:
    branches: ['**']
    paths-ignore:
      - '**.md'
      - 'docs/**'
```

`wd-stg-ci.yml` 과 `wd-prd-ci.yml` 은 `workflow_dispatch` 전용이라 이 push로 트리거되지 않습니다.

## 후속 과제

검증 과정에서 확인된 별건 결함입니다. 이 PR에서는 다루지 않습니다.

| 위치 | 내용 |
|---|---|
| `.github/workflows/wd-stg-ci.yml:41`, `wd-prd-ci.yml:41` | 두 워크플로우가 모두 `MANIFEST_PATH=apps/plus-poc-app-hk/deployment.yaml` 을 가리켜, STG/PRD 배포가 실제로는 HK 매니페스트만 갱신 |
| `src/server.js:125` | URL 파싱 base를 클라이언트 제어 `Host` 헤더로 구성 — `Host: [` 로 프로세스 종료 가능 |
| `build.yml` | `concurrency` 가드 없음 (`wd-*-ci.yml` 에는 있음) |
| `Dockerfile` | `USER` 미지정으로 root 실행, `HEALTHCHECK` 없음, 베이스 이미지 digest 미고정 |

## 정리

검증이 끝나면 이 문서와 브랜치는 삭제해도 무방합니다.
