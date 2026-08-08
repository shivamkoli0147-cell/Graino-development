---
name: Artifact workflow ports
description: Port ownership and duplicate workflow behavior for the KisanDirect artifact setup.
---

The managed artifact workflows must be used for preview: the KisanDirect web artifact owns port 21034 and the API artifact owns port 8080. Starting duplicate legacy workflows on those ports produces an "artifact crashed" preview error even when the app itself is healthy.

**Why:** The frontend and API can both return HTTP 200 while a second workflow fails with EADDRINUSE, making the preview appear broken.

**How to apply:** Before restarting a failed preview workflow, check for another workflow already listening on its configured port. Keep `artifacts/kisan-direct: web` and `artifacts/api-server: API Server` running; stop or remove duplicate workflows instead of changing application code.