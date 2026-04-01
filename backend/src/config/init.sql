-- ============================================================
--  셀러 허브 DB 스키마
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 사용자
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  name        VARCHAR(100) NOT NULL,
  fcm_token   TEXT,
  kakao_phone VARCHAR(20),
  notify_email VARCHAR(255),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 플랫폼 계정 (per user)
CREATE TABLE IF NOT EXISTS platform_accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform    VARCHAR(30) NOT NULL,   -- naver | coupang | kakao | 11st | auction | gmarket
  account_name VARCHAR(100) NOT NULL, -- 사용자 지정 별명
  seller_id   VARCHAR(200),
  client_id   VARCHAR(500),           -- 암호화 저장
  client_secret VARCHAR(500),         -- 암호화 저장
  extra_field VARCHAR(500),           -- vendor_id / channel_id / app_key 등
  is_active   BOOLEAN DEFAULT TRUE,
  last_polled_at TIMESTAMPTZ,
  last_error  TEXT,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 알림 (정규화된 이벤트)
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id    UUID NOT NULL REFERENCES platform_accounts(id) ON DELETE CASCADE,
  platform      VARCHAR(30) NOT NULL,
  event_type    VARCHAR(20) NOT NULL,  -- order | cancel | refund | exchange | inquiry
  priority      VARCHAR(10) DEFAULT 'normal', -- high | normal | low
  status        VARCHAR(20) DEFAULT 'pending', -- pending | done | ignored
  external_id   VARCHAR(200) NOT NULL,  -- 플랫폼 원본 주문번호
  title         VARCHAR(500) NOT NULL,
  product_name  VARCHAR(500),
  customer_name VARCHAR(200),
  amount        BIGINT,                 -- 원 단위
  reason        VARCHAR(500),
  raw_payload   JSONB,                  -- 원본 API 응답 전체 보관
  notified_push  BOOLEAN DEFAULT FALSE,
  notified_kakao BOOLEAN DEFAULT FALSE,
  notified_email BOOLEAN DEFAULT FALSE,
  occurred_at   TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (account_id, external_id, event_type)
);

-- 알림 설정
CREATE TABLE IF NOT EXISTS notification_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  push_enabled    BOOLEAN DEFAULT TRUE,
  kakao_enabled   BOOLEAN DEFAULT TRUE,
  email_enabled   BOOLEAN DEFAULT FALSE,
  email_frequency VARCHAR(20) DEFAULT 'daily',  -- instant | hourly | daily
  sound_enabled   BOOLEAN DEFAULT TRUE,
  -- 유형별 ON/OFF
  type_order      BOOLEAN DEFAULT TRUE,
  type_cancel     BOOLEAN DEFAULT TRUE,
  type_refund     BOOLEAN DEFAULT TRUE,
  type_exchange   BOOLEAN DEFAULT TRUE,
  type_inquiry    BOOLEAN DEFAULT TRUE,
  -- 방해금지
  quiet_enabled   BOOLEAN DEFAULT TRUE,
  quiet_start     TIME DEFAULT '22:00',
  quiet_end       TIME DEFAULT '08:00',
  quiet_days      INT[] DEFAULT '{1,2,3,4,5}',  -- 0=일, 1=월 .. 6=토
  -- 자동화
  auto_draft_reply BOOLEAN DEFAULT TRUE,
  auto_report      BOOLEAN DEFAULT TRUE,
  report_time      TIME DEFAULT '08:00',
  renotify_hours   INT DEFAULT 2,       -- 0 = 사용안함
  poll_interval    INT DEFAULT 5,       -- 분
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_notifications_user_status   ON notifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_type     ON notifications(user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_notifications_account       ON notifications(account_id);
CREATE INDEX IF NOT EXISTS idx_notifications_occurred      ON notifications(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_accounts_user      ON platform_accounts(user_id, platform);

-- 기본 사용자 (개발용)
INSERT INTO users (email, password, name)
VALUES ('admin@sellerhub.com',
        '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password
        '관리자')
ON CONFLICT DO NOTHING;

-- 기본 알림 설정
INSERT INTO notification_settings (user_id)
SELECT id FROM users WHERE email = 'admin@sellerhub.com'
ON CONFLICT DO NOTHING;
