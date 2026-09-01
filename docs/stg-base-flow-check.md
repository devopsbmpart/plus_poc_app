# stg base PR 플로우 검증 기록 (stg 계보 분기)

이 문서는 `stg` 에서 직접 분기한 브랜치로 **`stg` 를 base 로 하는 PR 경로**를 확인하기 위한 테스트 산출물입니다. 애플리케이션 코드·워크플로우·설정은 일절 변경하지 않습니다.

## PR #10 과 무엇이 다른가

#10 도 base 는 `stg` 였지만 head 가 `develop` 파생이었습니다. 두 브랜치가 갈라져 있어 문서 1개만 추가했는데도 PR 파일 목록에 5개가 잡혔습니다.

```
git rev-list --left-right --count origin/stg...origin/develop
14      13
```

이 브랜치는 `origin/stg` 에서 직접 분기했으므로 격차가 0 입니다. 같은 base 를 **오염되지 않은 diff 로** 다시 확인하는 것이 목적입니다.

| PR | head 계보 | base | 딸려온 파일 |
|---|---|---|---|
| #10 | `develop` 파생 | `stg` | 워크플로우 2종 + `.gitignore` + `ci-trigger.http` |
| 이 PR | `stg` 파생 | `stg` | 없음 |

## 브랜치 구성

| 항목 | 값 |
|---|---|
| 분기 기준 | `origin/stg` (`aa6cfa4`) |
| head 브랜치 | `feature/docs-stg-base-check` |
| base 브랜치 | `stg` |
| 변경 범위 | `docs/stg-base-flow-check.md` 신규 1개 |

## stg 와 prd 는 현재 같은 커밋이다

측정 시점 기준 두 브랜치는 완전히 동일합니다.

```
git rev-list --left-right --count origin/stg...origin/prd
0       0
```

`origin/stg` 와 `origin/prd` 모두 `aa6cfa4` 를 가리키며 트리도 같습니다. 즉 지금 `stg -> prd` 승격 PR 을 열면 diff 가 비어 있습니다.

## 예상 CI 동작: develop 계보보다 싸다

`stg` 계보에서 `push` 트리거를 가진 워크플로우는 **하나뿐**입니다.

| 파일 | name | 트리거 | concurrency |
|---|---|---|---|
| `build.yml` | `build` | `push: branches['**']` + `workflow_dispatch` | 없음 |
| `wd-stg-ci.yml` | `stg-build` | `workflow_dispatch` 전용 | `group: build-01-gitops` |
| `wd-prd-ci.yml` | `prd-build` | `workflow_dispatch` 전용 | `group: build-01-gitops` |

따라서 이 push 는 GHCR 이미지 빌드를 **1회** 실행시킬 것으로 예상됩니다.

`develop` 계보에는 `push: branches['**']` 워크플로우가 `build.yml` 과 `new-build.yml` 두 개 있어 같은 문서 1줄 변경에 2회가 돌고, PR #11 실측에서는 러너를 5분 30초 점유했습니다. **워크플로우 파일이 브랜치별로 갈려 있어 같은 변경의 CI 비용이 브랜치마다 다릅니다.**

`build.yml` 에는 `paths-ignore` 가 없으므로 문서 전용 변경도 빌드를 트리거합니다. 실측값은 PR 코멘트에 기록합니다.

## 개선안 (이 PR 범위 아님)

```yaml
on:
  push:
    branches: ['**']
    paths-ignore:
      - '**.md'
      - 'docs/**'
```

`wd-*-ci.yml` 에는 `concurrency` 가드가 있지만 `build.yml` 에는 없습니다.

## 기존 문서의 낡은 기록 정정

`docs/pr-flow-test.md` 의 후속 과제 표는 `wd-stg-ci.yml` 과 `wd-prd-ci.yml` 이 둘 다 `apps/plus-poc-app-hk/deployment.yaml` 을 가리켜 STG/PRD 배포가 HK 매니페스트만 갱신한다고 기록했습니다. **현재 `origin/stg` 기준으로는 해당하지 않습니다.**

| 파일 | `MANIFEST_PATH` |
|---|---|
| `wd-stg-ci.yml:41` | `apps/plus-poc-app-stg/deployment.yaml` |
| `wd-prd-ci.yml:41` | `apps/plus-poc-app-prd/deployment.yaml` |

각자 올바른 환경 매니페스트를 가리키고 있습니다. 두 워크플로우가 `concurrency: group: build-01-gitops` 를 공유하는 것은 동일 GitOps 저장소(`devopsbmpart/plus_poc_gitops`)에 쓰기 때문이며, 의도된 직렬화로 보입니다.

## 정리

검증이 끝나면 이 문서와 `feature/docs-stg-base-check` 브랜치는 삭제해도 무방합니다.
