# 워크로드 콘솔

Trombone 개발 클러스터의 워크로드를 조회하고 조작하는 내부 콘솔.

DevOps 플랫폼 연동 PoC의 **배포 대상 애플리케이션**이다.
플랫폼(`plus_poc`)이 Jira 이슈를 받아 이 저장소에 브랜치와 PR을 만들고,
Actions가 이미지를 빌드하면 GitOps 저장소를 거쳐 Argo CD가 배포한다.

## 기능

- 워크로드 목록 — 상태·레플리카·CPU·메모리·재시작 횟수
- 검색 (이름·팀·이미지) 및 환경/상태 필터
- 열 정렬, 키보드 이동(↑↓), Enter로 상세 펼침
- 재시작 / 레플리카 증감

## 실행

```bash
npm start
```

기본 포트 8080. `PORT`로 변경한다.

## 빌드 정보 주입

화면 하단 스트립에 표시된다. 실제 서비스가 버전 정보를 노출하는 방식과 같다.

| 환경변수 | 설명 |
|---|---|
| `APP_VERSION` | 표시할 버전 |
| `JIRA_ISSUE` | 이 빌드가 나온 Jira Issue Key |
| `GIT_REVISION` | 커밋 sha |
| `IMAGE_DIGEST` | 이미지 digest |

배포된 파드가 자신이 어느 이슈에서 왔는지 알고 있게 하려는 것이다.
Issue Key는 브랜치명 → 커밋 trailer → 이미지 라벨 → 매니페스트 → 환경변수 순으로 전파된다.

## 엔드포인트

| 경로 | 설명 |
|---|---|
| `GET /` | 콘솔 화면 |
| `GET /healthz`, `/readyz` | 상태 확인 |
| `GET /api/workloads` | 워크로드 목록 |
| `POST /api/workloads/:id/restart` | 재시작 |
| `POST /api/workloads/:id/scale-up` / `scale-down` | 레플리카 증감 |
| `GET /api/build` | 빌드 정보 |

데이터는 시드 기반으로 생성한다. 재시작해도 같은 목록이 나오고
사용률만 완만하게 움직인다. 요청마다 값이 튀면 화면을 신뢰할 수 없다.
