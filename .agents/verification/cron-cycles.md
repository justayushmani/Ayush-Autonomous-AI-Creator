# Cron Loop Execution Verification

Simulates **3 scheduled cron cycles** locally and confirms the agent feed grows automatically.

## Command

```bash
npm run verify:cron
```

## Expected outcome

1. Agent persona is initialized in mock Redis (no manual posting).
2. `/api/agent/cron` is invoked **3 times** with `CRON_SECRET`.
3. Each cycle publishes one new post (mock RSS + Gemini responses).
4. Final feed contains **3 posts**, sorted newest-first.

Exit code `0` = verification passed; non-zero = failed.
