# STG PR 플로우 검증 기록

이 문서는 `devopsbmpart/plus_poc_app` 저장소에서 **`stg` 를 base 로 하는 PR 경로**를 실제로 통과시켜 확인하기 위한 테스트 산출물입니다. 애플리케이션 코드·워크플로우·설정은 일절 변경하지 않습니다.

## 검증 목적

앞선 검증(`docs/pr-flow-test.md`, PR #9)은 base 가 `main` 이었습니다. 이 문서는 base 가 `stg` 인 경로를 별도로 확인합니다.

- `develop` 에서 분기한 feature 브랜치가 `stg` 로 PR 을 열 수 있는가
- 이미 열려 있는 `develop -> stg` PR(#6)과 동일 base 에 PR 을 병행 생성할 수 있는가
- 문서 전용 변경이 `develop` 계열에서 어떤 CI 를 트리거하는가

## 브랜치 구성

| 항목 | 값 |
|---|---|
| 분기 기준 | `origin/develop` |
| head 브랜치 | `feature/docs-stg-pr-check` |
| base 브랜치 | `stg` |
| 변경 범위 | `docs/stg-pr-flow-check.md` 신규 1개 |
| 커밋 identity | `devopsbmpart <devopsbmpart@users.noreply.github.com>` |

## 브랜치 분기 상태

측정 시점 기준 `origin/stg` 와 `origin/develop` 은 양쪽으로 갈라져 있습니다.

```
git rev-list --left-right --count origin/stg...origin/develop
14      13
```

두 브랜치의 실제 차이 파일은 다음 4개입니다.

| 파일 | 비고 |
|---|---|
| `.github/workflows/build-01.yml` | `develop` 에만 존재 (`workflow_dispatch` 전용) |
| `.github/workflows/new-build.yml` | `develop` 에만 존재 (`push` + `workflow_dispatch`) |
| `.gitignore` | 내용 차이 |
| `ci-trigger.http` | `develop` 에만 존재 |

즉 이 PR 의 diff 에는 위 파일들이 함께 포함되어 보입니다. 이는 base(`stg`)와 head(`develop` 파생)의 기존 격차이며, 이 커밋이 만든 변경이 아닙니다. **이 커밋이 추가한 파일은 `docs/stg-pr-flow-check.md` 하나뿐입니다.**

## 확인된 CI 트리거

`develop` 계열에는 `push: branches: ['**']` 를 가진 워크플로우가 **두 개** 있습니다.

- `.github/workflows/build.yml`
- `.github/workflows/new-build.yml`

```yaml
on:
  push:
    branches: ['**']
```

둘 다 `paths-ignore` 가 없으므로, **이 문서 한 개만 추가하는 커밋이 GHCR 이미지 빌드를 두 번 실행시킵니다.** `stg` 쪽에는 `build.yml` 하나만 있어 한 번만 도는 것과 대비됩니다. 소스가 바뀌지 않았으므로 산출 이미지는 직전 빌드와 동일하고, 러너 시간만 중복 소비됩니다.

개선안(이 PR 범위 아님):

```yaml
on:
  push:
    branches: ['**']
    paths-ignore:
      - '**.md'
      - 'docs/**'
```

`build-01.yml` 은 `workflow_dispatch` 전용이라 이 push 로는 트리거되지 않습니다.

## 후속 과제

검증 중 확인된 별건입니다. 이 PR 에서는 다루지 않습니다.

| 위치 | 내용 |
|---|---|
| `.github/workflows/build.yml`, `new-build.yml` | 두 워크플로우 모두 `name: build` 로 동일해 Actions 목록에서 구분되지 않음 |
| `develop` vs `stg` | 워크플로우 파일 3종이 브랜치별로 갈려 있어 브랜치마다 CI 동작이 다름 |
| `ci-trigger.http` | `develop` 에만 남은 트리거 테스트 잔여물 — 정리 대상 |

## 정리

검증이 끝나면 이 문서와 `feature/docs-stg-pr-check` 브랜치는 삭제해도 무방합니다.
