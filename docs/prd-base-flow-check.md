# prd base PR 플로우 검증 기록

이 문서는 **`prd` 를 base 로 하는 PR 경로**를 확인하기 위한 테스트 산출물입니다. 애플리케이션 코드·워크플로우·설정은 일절 변경하지 않습니다.

## 왜 필요한가

`prd` 는 지금까지 한 번도 PR base 로 검증되지 않은 유일한 배포 브랜치입니다.

| base | PR | head 계보 | diff 오염 |
|---|---|---|---|
| `main` | #9 (머지됨) | 독립 | 없음 |
| `stg` | #10 (열림) | `develop` 파생 | 파일 4개 딸려옴 |
| `develop` | #11 (열림) | `develop` 파생 | 없음 |
| `stg` | (동시 생성) | `stg` 파생 | 없음 |
| `prd` | 이 PR | `prd` 파생 | 없음 |

배포 사슬의 최종 단계가 `prd` 인 만큼, 여기로 향하는 PR 이 어떤 CI 를 트리거하는지는 사고 위험이 가장 큰 구간입니다. 코드 위험 없이 문서 1개로 확인합니다.

## 브랜치 구성

| 항목 | 값 |
|---|---|
| 분기 기준 | `origin/prd` (`aa6cfa4`) |
| head 브랜치 | `feature/docs-prd-base-check` |
| base 브랜치 | `prd` |
| 변경 범위 | `docs/prd-base-flow-check.md` 신규 1개 |

`origin/prd` 에서 직접 분기했으므로 base 격차가 0 이고, PR 파일 목록에 이 문서 하나만 나타납니다.

## 주의: stg 와 prd 가 현재 같은 커밋이다

```
git rev-list --left-right --count origin/stg...origin/prd
0       0
```

둘 다 `aa6cfa4` 를 가리키고 트리도 동일합니다. 두 가지 함의가 있습니다.

1. 지금 `stg -> prd` 승격 PR 을 열면 **diff 가 비어 있습니다.**
2. `stg` 와 `prd` 는 코드가 같으므로, 두 환경의 차이는 저장소 내용이 아니라 **배포 워크플로우 입력값**에서만 발생합니다.

실제로 환경을 가르는 것은 `workflow_dispatch` 전용인 두 파일의 `MANIFEST_PATH` 입니다.

| 파일 | name | `MANIFEST_PATH` |
|---|---|---|
| `wd-stg-ci.yml:41` | `stg-build` | `apps/plus-poc-app-stg/deployment.yaml` |
| `wd-prd-ci.yml:41` | `prd-build` | `apps/plus-poc-app-prd/deployment.yaml` |

둘 다 GitOps 저장소 `devopsbmpart/plus_poc_gitops` 의 `main` 을 대상으로 하며, `concurrency: group: build-01-gitops` 를 **공유**합니다. 같은 저장소에 쓰기 때문에 의도된 직렬화로 보이지만, **stg 배포와 prd 배포가 서로를 기다린다**는 뜻이기도 합니다.

## 예상 CI 동작

`prd` 계보에서 `push` 트리거를 가진 워크플로우는 `build.yml` 하나뿐입니다.

| 파일 | 트리거 | concurrency |
|---|---|---|
| `build.yml` | `push: branches['**']` + `workflow_dispatch` | 없음 |
| `wd-stg-ci.yml` | `workflow_dispatch` 전용 | `build-01-gitops` |
| `wd-prd-ci.yml` | `workflow_dispatch` 전용 | `build-01-gitops` |

따라서 이 push 는 GHCR 이미지 빌드를 **1회** 실행시킬 것으로 예상됩니다. 문서 전용 변경이지만 `build.yml` 에 `paths-ignore` 가 없어 빌드는 돕니다.

**prd 배포 자체는 이 PR 로 트리거되지 않습니다.** `wd-prd-ci.yml` 이 `workflow_dispatch` 전용이기 때문입니다. 문서 변경이 실수로 운영 배포를 유발할 수 없다는 점은 이번 검증에서 확인하려는 핵심 항목입니다. 실측값은 PR 코멘트에 기록합니다.

## 개선안 (이 PR 범위 아님)

```yaml
on:
  push:
    branches: ['**']
    paths-ignore:
      - '**.md'
      - 'docs/**'
```

`build.yml` 에는 `concurrency` 가드가 없어 `prd` 로 연속 push 시 이미지 빌드가 중첩됩니다.

## 정리

검증이 끝나면 이 문서와 `feature/docs-prd-base-check` 브랜치는 삭제해도 무방합니다.
