# Smoke Test 剧本

> 部署到 Vercel + Supabase 后必跑的健康检查。所有命令用 curl,默认输出 HTTP 状态码。

## 前置

```bash
# 1. 替换为你的 Vercel 生产域名
export BASE=https://smartcareer.vercel.app

# 2. 注册一个临时测试账号
export EMAIL="smoke-$(date +%s)@example.com"
export PASS="SmokeTest123!"
```

## 用例

### 1. 首页可达 (200)

```bash
curl -s -o /dev/null -w "1. GET / → %{http_code}\n" "$BASE/"
# 期望: 200
```

### 2. 登录页可达 (200)

```bash
curl -s -o /dev/null -w "2. GET /login → %{http_code}\n" "$BASE/login"
# 期望: 200
```

### 3. 未登录 /api/auth/me 返 401

```bash
curl -s -o /dev/null -w "3. GET /api/auth/me (no cookie) → %{http_code}\n" "$BASE/api/auth/me"
# 期望: 401
```

### 4. 注册测试用户 (200/201)

```bash
curl -s -o /dev/null -w "4. POST /api/auth/register → %{http_code}\n" \
  -X POST "$BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"name\":\"Smoke\"}"
# 期望: 200 或 201
```

### 5. 登录拿 cookie (200)

```bash
curl -s -c smoke-cookies.txt -o /dev/null -w "5. POST /api/auth/login → %{http_code}\n" \
  -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"
# 期望: 200, smoke-cookies.txt 应含 sb-access-token
```

### 6. 携带 cookie 访问 /api/auth/me (200 + user)

```bash
curl -s -b smoke-cookies.txt -w "\n6. GET /api/auth/me (with cookie) → %{http_code}\n" "$BASE/api/auth/me"
# 期望: 200 + JSON 中含 user.email
```

### 7. 退出登录 (200)

```bash
curl -s -b smoke-cookies.txt -c smoke-cookies.txt -o /dev/null -w "7. POST /api/auth/logout → %{http_code}\n" \
  -X POST "$BASE/api/auth/logout"
# 期望: 200
```

## 一键跑完

```bash
#!/usr/bin/env bash
set -u
BASE="${BASE:-https://smartcareer.vercel.app}"
EMAIL="smoke-$(date +%s)@example.com"
PASS="SmokeTest123!"

echo "Base: $BASE  Email: $EMAIL"

curl -s -o /dev/null -w "1. GET /                         → %{http_code}\n" "$BASE/"
curl -s -o /dev/null -w "2. GET /login                    → %{http_code}\n" "$BASE/login"
curl -s -o /dev/null -w "3. GET /api/auth/me (no cookie)  → %{http_code}\n" "$BASE/api/auth/me"
curl -s -o /dev/null -w "4. POST /api/auth/register       → %{http_code}\n" -X POST "$BASE/api/auth/register" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"name\":\"Smoke\"}"
curl -s -c cookies.txt -o /dev/null -w "5. POST /api/auth/login          → %{http_code}\n" -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"
curl -s -b cookies.txt -w "\n6. GET /api/auth/me (with cookie) → %{http_code}\n" "$BASE/api/auth/me"
curl -s -b cookies.txt -c cookies.txt -o /dev/null -w "7. POST /api/auth/logout         → %{http_code}\n" -X POST "$BASE/api/auth/logout"
```

## 期望汇总

| # | 用例 | 期望 | 失败排查 |
|---|------|------|----------|
| 1 | GET / | 200 | next build 未跑 / next start 失败 |
| 2 | GET /login | 200 | next-intl locale 缺失 |
| 3 | GET /api/auth/me | 401 | middleware/auth 逻辑未生效 |
| 4 | POST /api/auth/register | 200/201 | Supabase URL/key 错 / 表未建 |
| 5 | POST /api/auth/login | 200 | Supabase auth 配错 / RLS 阻塞 |
| 6 | GET /api/auth/me (cookie) | 200 | cookie 没 set / 没带过去 |
| 7 | POST /api/auth/logout | 200 | supabase.auth.signOut 失败 |

> 任一非期望,先看 Vercel Runtime Logs → Supabase Logs (Auth + Postgres)。
