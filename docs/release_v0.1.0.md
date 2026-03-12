# Release v0.1.0 — OTP Verification for Payment Pages

**Date:** 2026-03-12  
**Image:** `ghcr.io/chatnationwork/tax-app:0.1.0`

---

## What's New

### 🔐 OTP Verification on Payment Pages
Payment pages (eSlip, NITA, AHL) now require OTP verification before proceeding. Users who have not authenticated are redirected to the OTP flow and returned to their payment page after successful verification.

### 🛠 Bug Fix: Winston Logger in Client Bundle
Fixed a build error caused by `winston` (a Node.js-only logging library) being imported into client-side code via the analytics module. Server-side logging remains unchanged; client-side analytics now uses browser-native `console` methods.

---

## Deployment

```bash
# Pull and deploy
docker pull ghcr.io/chatnationwork/tax-app:0.1.0

# Or use latest
docker pull ghcr.io/chatnationwork/tax-app:latest
```

No environment variable changes required.
