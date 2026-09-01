# develop base PR 플로우 검증 기록

이 문서는 `devopsbmpart/plus_poc_app` 저장소에서 **`develop` 을 base 로 하는 feature PR 경로**를 확인하기 위한 테스트 산출물입니다. 애플리케이션 코드·워크플로우·설정은 일절 변경하지 않습니다.

## 왜 또 하는가

앞선 두 검증은 base 가 달랐습니다.

| 검증 | head | base | 결과 |
|---|---|---|---|
| PR #9 | `docs/pr-flow-test` | `main` | 머지됨 |
| PR #10 | `feature/docs-stg-pr-check` | `stg` | 열림 |
| 이 문서 | `feature/docs-develop-pr-check` | `develop` | — |

`main` 과 `stg` base 는 확인됐지만, 실제 개발자가 가장 자주 쓰게 될 **feature -> develop** 경로는 아직 확인되지 않았습니다.

## 앞선 검증과 결정적으로 다른 점: diff 가 깨끗하다

PR #10 은 base 가 `stg`, head 가 `develop` 파생이라 두 브랜치의 기존 격차가 diff 에 함께 딸려 왔습니다.

```
git rev-list --left-right --count origin/stg...origin/develop
14      13
```

그래서 문서 1개만 추가했는데도 PR 파일 목록에 5개가 잡혔습니다.

```
.github/workflows/build-01.yml
.github/workflows/new-build.yml
.gitignore
ci-trigger.http
docs/stg-pr-flow-check.md   <- 실제 추가한 것은 이것뿐
```

이 PR 은 base 와 head 가 같은 계보(`origin/develop`)라 격차가 0 입니다.

```
git diff --name-only origin/develop...HEAD
```

따라서 **파일 목록에 이 문서 하나만 나타납니다.** 문서 전용 변경의 CI 트리거 범위를 다른 변경과 섞이지 않은 상태로 관찰할 수 있는 유일한 구성입니다.

## 브랜치 구성

| 항목 | 값 |
|---|---|
| 분기 기준 | `origin/develop` (`29b5dcb`) |
| head 브랜치 | `feature/docs-develop-pr-check` |
| base 브랜치 | `develop` |
| 변경 범위 | `docs/develop-pr-flow-check.md` 신규 1개 |
| 커밋 identity | `devopsbmpart <devopsbmpart@users.noreply.github.com>` |

## 예상 CI 동작

`develop` 계열에는 `push: branches: ['**']` 를 가진 워크플로우가 두 개 있고, 둘 다 `paths-ignore` 가 없습니다.

- `.github/workflows/build.yml`
- `.github/workflows/new-build.yml`

PR #10 에서 이 조합이 문서 1줄 변경에 GHCR 이미지 빌드를 **2회** 실행시키는 것을 실측했습니다.

```
GET /actions/runs?branch=feature/docs-stg-pr-check
total_count = 2

build | .github/workflows/new-build.yml | push | completed/success
build | .github/workflows/build.yml     | push | completed/success
```

이 브랜치도 동일 계보이므로 같은 결과가 예상됩니다. 실측값은 PR 코멘트에 기록합니다.

`build-01.yml` 은 `workflow_dispatch` 전용이라 트리거되지 않습니다.

## 개선안 (이 PR 범위 아님)

```yaml
on:
  push:
    branches: ['**']
    paths-ignore:
      - '**.md'
      - 'docs/**'
```

두 워크플로우 모두 `name: build` 로 같아 Actions 목록에서 어느 쪽 런인지 구분되지 않는 문제도 함께 정리가 필요합니다.

## 정리

검증이 끝나면 이 문서와 `feature/docs-develop-pr-check` 브랜치는 삭제해도 무방합니다.
