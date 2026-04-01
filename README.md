# 셀러 허브 — 멀티 오픈마켓 알림 관리 시스템

쿠팡·네이버 스마트스토어·톡스토어·11번가·옥션·G마켓의
주문 / 취소 / 반품 / 교환 / 문의 알림을 한 곳에서 관리합니다.

---

## 기술 스택

| 역할 | 기술 |
|---|---|
| 웹 프론트엔드 | React 18 + Vite + Zustand + React Query |
| 백엔드 API | Node.js + Express |
| 데이터베이스 | PostgreSQL 16 |
| 캐시 / 락 | Redis 7 |
| 컨테이너 | Docker + Docker Compose |
| 푸시 알림 | Firebase Cloud Messaging (FCM) |
| 카카오 알림톡 | 알리고 비즈메시지 API |
| 이메일 | SendGrid |

---

## 프로젝트 구조

```
seller-hub/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── .env                    ← API 키 설정 (직접 수정)
│   ├── package.json
│   └── src/
│       ├── index.js            Express 서버 진입점
│       ├── config/
│       │   ├── db.js           PostgreSQL 연결 풀
│       │   ├── redis.js        Redis 클라이언트
│       │   └── init.sql        DB 초기 스키마
│       ├── middleware/auth.js  JWT 인증
│       ├── routes/
│       │   ├── auth.js         로그인 / 회원가입
│       │   ├── accounts.js     플랫폼 계정 CRUD
│       │   ├── notifications.js 알림 목록 / 통계
│       │   └── settings.js     알림 설정
│       └── services/
│           ├── scheduler.js    폴링 스케줄러 (5분마다)
│           ├── naverApi.js     네이버 커머스 API
│           ├── coupangApi.js   쿠팡 Wing API (HMAC 서명)
│           ├── notifier.js     FCM / 알림톡 / 이메일 발송
│           └── platformTest.js API 연결 테스트
└── frontend/
    ├── Dockerfile
    ├── .env
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx             라우팅
        ├── store/index.js      Zustand 전역 상태
        ├── services/api.js     Axios (토큰 자동 주입)
        ├── types/meta.js       유형·플랫폼 색상/라벨
        ├── components/common/Layout.jsx   사이드바
        └── pages/
            ├── LoginPage.jsx
            ├── DashboardPage.jsx   알림 목록 + 통계
            ├── AccountsPage.jsx    계정 추가/수정/삭제
            └── SettingsPage.jsx    알림 설정 전체
```

---

## 설치 및 실행 (Docker — 권장)

### 1단계. Docker Desktop 설치

- Mac/Windows: https://www.docker.com/products/docker-desktop/
- Ubuntu:
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER && newgrp docker
```

### 2단계. 프로젝트 다운로드

```bash
# ZIP 다운로드 후 압축 해제하거나
git clone https://github.com/your-repo/seller-hub.git
cd seller-hub
```

### 3단계. API 키 입력

`backend/.env` 파일을 텍스트 편집기로 열어 본인 키를 입력합니다.

```bash
# Mac / Linux
nano backend/.env

# Windows
notepad backend\.env
```

> **키가 없어도 실행은 됩니다.**
> 키가 없으면 해당 플랫폼 폴링만 건너뜁니다.
> 먼저 UI를 확인하고 싶으면 이 단계를 건너뛰어도 됩니다.

### 4단계. 실행

```bash
# 전체 빌드 + 실행 (처음 실행 시 3~5분 소요)
docker compose up --build

# 백그라운드 실행
docker compose up -d --build
```

### 5단계. 접속

| 서비스 | 주소 |
|---|---|
| 웹 대시보드 | http://localhost:3000 |
| 백엔드 API | http://localhost:4000/api |
| 헬스체크 | http://localhost:4000/api/health |

**기본 로그인 계정**
- 이메일: `admin@sellerhub.com`
- 비밀번호: `password`

### 종료

```bash
docker compose down

# DB 데이터까지 완전 삭제
docker compose down -v
```

---

## 설치 및 실행 (Docker 없이 — 로컬)

Node.js 20+, PostgreSQL 16, Redis 7이 설치된 경우입니다.

### 백엔드

```bash
cd backend
npm install

# .env 수정 — 로컬 DB 주소로 변경
# DATABASE_URL=postgresql://postgres:password@localhost:5432/sellerhub
# REDIS_URL=redis://localhost:6379

# DB 스키마 초기화
psql -U postgres -c "CREATE DATABASE sellerhub;"
psql -U postgres -d sellerhub -f src/config/init.sql

# 개발 서버 실행 (파일 변경 시 자동 재시작)
npm run dev
```

### 프론트엔드

```bash
cd frontend
npm install

# .env 수정
# VITE_API_URL=http://localhost:4000/api

npm run dev
```

---

## 플랫폼별 API 키 발급 방법

### 네이버 스마트스토어

1. https://sell.smartstore.naver.com 로그인
2. **설정 → API 관리 → 애플리케이션 등록**
3. 권한 체크: `주문 조회`, `클레임 조회`, `문의 조회`
4. **Client ID / Client Secret** 복사
5. `backend/.env`의 `NAVER_1_CLIENT_ID`, `NAVER_1_CLIENT_SECRET`에 입력
6. 계정이 3개면 `NAVER_2_*`, `NAVER_3_*`도 동일하게 입력

### 쿠팡 Wing

1. https://wing.coupang.com 로그인
2. **설정 → 오픈 API → API 키 발급**
3. **Access Key / Secret Key** 복사, **Vendor ID**는 설정 > 판매자 정보에서 확인
4. `COUPANG_1_ACCESS_KEY`, `COUPANG_1_SECRET_KEY`, `COUPANG_1_VENDOR_ID` 입력

### 카카오 톡스토어

1. https://developers.kakao.com → 내 애플리케이션 → 앱 추가
2. **비즈니스 → 카카오 커머스 API** 사용 신청
3. **앱 키 → REST API 키** 복사
4. `KAKAO_1_APP_KEY`, `KAKAO_1_ADMIN_KEY` 입력

### 11번가

1. https://openapi.11st.co.kr 접속
2. 판매자 로그인 → Open API 신청 → **API Key** 발급
3. `ELEVENST_API_KEY` 입력

### 옥션 / G마켓

1. https://api.gmarket.co.kr 접속
2. 판매자 인증 → **API Key 발급** (옥션·G마켓 공통)
3. `GMARKET_API_KEY`, `GMARKET_SECRET_KEY` 입력

### Firebase FCM (모바일 푸시 알림)

1. https://console.firebase.google.com → 프로젝트 생성
2. **프로젝트 설정 → 클라우드 메시징 → 서버 키** 복사
3. `FCM_SERVER_KEY` 입력

### 이메일 (SendGrid)

1. https://sendgrid.com 가입 → **Settings → API Keys → Create API Key**
2. `SENDGRID_API_KEY` 입력
3. `SENDGRID_FROM_EMAIL`에 발신자 이메일 입력

---

## 주요 API 엔드포인트 정리

```
POST   /api/auth/login                로그인
POST   /api/auth/register             회원가입
GET    /api/auth/me                   내 정보

GET    /api/accounts                  계정 목록
POST   /api/accounts                  계정 추가
PUT    /api/accounts/:id              계정 수정
DELETE /api/accounts/:id              계정 삭제
POST   /api/accounts/:id/test         API 연결 테스트

GET    /api/notifications             알림 목록
                                      ?type=cancel
                                      ?account_id=uuid
                                      ?status=pending
GET    /api/notifications/stats       유형·플랫폼별 미처리 건수
PATCH  /api/notifications/:id/done    단건 처리완료
PATCH  /api/notifications/done-all    일괄 처리완료

GET    /api/settings                  알림 설정 조회
PUT    /api/settings                  알림 설정 저장
```

---

## 새 플랫폼 추가하는 법

1. `backend/src/services/새플랫폼Api.js` 파일 생성
2. `fetchEvents(account)` 함수 구현 (반환값 형식은 naverApi.js 참고)
3. `scheduler.js`의 `FETCHERS`에 등록:

```js
const FETCHERS = {
  naver:   fetchNaverEvents,
  coupang: fetchCoupangEvents,
  mynewplat: fetchMyNewPlatEvents,  // ← 추가
};
```

4. `frontend/src/types/meta.js`의 `PLATFORM_META`에 색상·라벨 추가:

```js
export const PLATFORM_META = {
  ...
  mynewplat: { label: '새플랫폼', color: '#185FA5', bg: '#E6F1FB', short: 'N' },
};
```

---

## 토스쇼핑 / 올웨이즈 안내

두 플랫폼 모두 **공개 판매자 API가 없어** 자동 연동이 불가합니다.
판매자센터에서 직접 확인해야 하며, 향후 공식 API 출시 시
위 방법으로 쉽게 추가할 수 있습니다.

---

## 문제 해결

| 증상 | 해결 방법 |
|---|---|
| `docker compose` 명령어 없음 | Docker Desktop 재설치 또는 `docker-compose`(하이픈) 사용 |
| 포트 3000 / 4000 충돌 | `lsof -i :3000` 으로 점유 프로세스 확인 후 종료 |
| DB 연결 실패 | `docker compose logs postgres` 로 로그 확인 |
| 알림이 오지 않음 | `.env`의 FCM_SERVER_KEY 확인, 계정 관리에서 **테스트** 버튼 클릭 |
| 프론트 빈 화면 | 브라우저 콘솔(F12) 확인, `docker compose logs frontend` |
| 빌드 오류 | `docker compose down -v && docker compose up --build` |
