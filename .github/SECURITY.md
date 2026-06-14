# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| latest  | Yes       |

## Reporting a Vulnerability

**Do NOT create a public GitHub issue for security vulnerabilities.**

Report security issues via GitHub Security Advisories:

1. Go to the Security tab of this repository
2. Click "Report a vulnerability"
3. Fill in the details

We will respond within 48 hours and aim to patch critical issues within 7 days.

## Security Practices

- All API endpoints require JWT RS256 authentication unless explicitly public
- Secrets are managed via AWS Secrets Manager — never committed to git
- Dependencies are automatically scanned via `dependency-review.yml`
- Static code analysis runs on every PR via `security-scan.yml`
