# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.3.x   | ✅        |
| 1.2.x   | ✅        |
| 1.1.x   | ⚠️ limited |
| < 1.1   | ❌        |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead:

1. Email the maintainers (or use GitHub **Security Advisories** → *Report a vulnerability* if available).
2. Include:
   - Description of the issue
   - Steps to reproduce
   - Affected versions / commit
   - Potential impact
   - Suggested fix (optional)

We aim to acknowledge reports within **72 hours** and provide a status update within **7 days**.

## Hardening notes (operators)

- Run with `DEMO_MODE=false` and a real `AI_API_KEY` only on trusted hosts.
- Set `CORS_ORIGIN` to your frontend origin in production.
- Tune `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS` behind a reverse proxy.
- Set `TRUST_PROXY=true` when behind nginx/Caddy/Cloudflare.
- Keep `DB_PATH` on a private volume; SQLite file contains world and chat data.
- Never commit `.env` or API keys.

## Scope

In scope:

- Authentication/authorization gaps (if introduced)
- Injection, path traversal, unsafe deserialization
- Secrets leakage in logs or responses
- Dependency CVEs in direct dependencies

Out of scope:

- Issues only reproducible with intentional `DEMO_MODE` fixtures
- Social engineering
- Denial of service against third-party AI providers
