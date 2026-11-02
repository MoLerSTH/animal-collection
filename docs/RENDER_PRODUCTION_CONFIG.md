# Render Production Environment Configuration Guide

This guide details the required environment variables and infrastructure configuration for deploying the **Animal Collection Backend** on Render with production stability and security.

---

## 1. Required Environment Variables

Configure these settings under **Render Dashboard > Your Web Service > Environment Variables**:

| Variable | Recommended Production Value | Description |
| :--- | :--- | :--- |
| `ENVIRONMENT` | `production` | Enforces production mode (`DEBUG=False`, disables mock tokens, validates critical secrets). |
| `DATABASE_URL` | `postgresql://...` | **Internal Connection String** from your Render Managed PostgreSQL instance. Do **not** leave empty (prevents ephemeral SQLite fallback). |
| `JWT_SECRET` | *(64-character random hex string)* | Secret key for signing and verifying JWT tokens. Must remain constant across deploys. |
| `JWT_ALGORITHM` | `HS256` | Standard HMAC-SHA256 signature algorithm. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` *(7 days)* or `43200` *(30 days)* | Token validity duration. Prevents daily session expirations for mobile users. |
| `GOOGLE_WEB_CLIENT_ID` | `...apps.googleusercontent.com` | Google OAuth 2.0 Web Client ID matching the client ID used by the mobile app. |
| `GEMINI_API_KEY` | *(Your Gemini API key)* | API key for Google Gemini Multimodal Vision AI model. |
| `AI_WEEKLY_QUOTA_PER_USER` | `7` | Weekly quota for animal identifications per user. |
| `AI_MAX_IMAGE_SIZE_MB` | `10` | Maximum acceptable photo size (MB). |
| `CORS_ORIGINS` | `*` *(or your domains)* | Permitted CORS origins for API requests. |

---

## 2. Generating Secure Keys

Generate a secure 256-bit secret for `JWT_SECRET` using either command:

```bash
# Using OpenSSL
openssl rand -hex 32

# Using Python
python -c "import secrets; print(secrets.token_hex(32))"
```

> [!CAUTION]
> **Never use the default development JWT key in production.** If `JWT_SECRET` is changed or generated dynamically at startup, **all existing user sessions will be invalidated immediately**, causing `401 Unauthorized` on all protected endpoints.

---

## 3. Database Persistence Checklist

1. **Create Managed PostgreSQL**: In Render Dashboard, click **New + > PostgreSQL**.
2. **Connect Service**: Copy the **Internal Database URL** and set it as `DATABASE_URL` in your Web Service environment variables.
3. **Verify Connection**:
   - Check service logs upon deployment. You should **not** see:
     ```
     [Warning] PostgreSQL engine initialization fallback: ...
     ```
   - If that warning appears, the service is using SQLite on ephemeral disk, which is wiped on every restart or free-tier sleep.

---

## 4. Diagnosing 401 Unauthorized in Render Logs

With the latest diagnostic updates, the backend logs the exact reason for any authentication failure:

* `[Auth Failure] 401 Unauthorized: reason=token_expired`:
  * The user's JWT access token exceeded `ACCESS_TOKEN_EXPIRE_MINUTES`.
  * **Solution**: User needs to sign in again, or increase `ACCESS_TOKEN_EXPIRE_MINUTES`.
* `[Auth Failure] 401 Unauthorized: reason=invalid_signature`:
  * The token was signed with a different `JWT_SECRET` (e.g. secret was rotated, or request came from dev mock).
* `[Auth Failure] 401 Unauthorized: user_id=... not found in database`:
  * The database was reset or connection dropped to a fallback SQLite instance.
  * **Solution**: Ensure `DATABASE_URL` connects to persistent PostgreSQL.
