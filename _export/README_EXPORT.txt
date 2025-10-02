This folder contains a minimal redacted package for sharing.

Included:
- Root package.json (workspaces and scripts)
- Root lock file (package-lock.json)
- Backend: package.json, tsconfig.json, src/index.ts, src/config.ts, .env (redacted)
- Frontend: package.json, vite.config.ts, .env (redacted), src/services/invoiceService.ts

Notes:
- Secrets are redacted; only variable names and example values are shown.
- Ports and VITE_* variables are preserved where applicable.
