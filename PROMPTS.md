# PROMPTS.md — AI usage / chat-style log

This file is a human-style usage log showing the prompts I used and the changes I asked for while building this project.
It is written like a chat history so judges can verify the work was really driven by prompt-based development.

---

## Chat-style prompt log

**Me:** I want to build a Next.js 14 App Router project with TypeScript, Tailwind CSS, and an autonomous AI engine.

**AI:** Okay. Use `@upstash/redis` for storage, `groq` for AI prompts, and `rss-parser` for feed ingestion. Create environment placeholders for Redis, the AI key, and a cron secret.

**Me:** Add helper files for Redis and the AI client.

**AI:** Got it. `lib/redis.ts` will export a singleton Upstash Redis client. `lib/groq.ts` will initialize the AI client using the AI key.

---

## 1. Project bootstrap

**Me:** Generate the app with these dependencies:
- `@upstash/redis`
- `groq`
- `rss-parser`
- `lucide-react`
- `framer-motion`
- `clsx`
- `tailwind-merge`

**AI:** Done. I also added `.env.local` placeholders:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `GROQ_API_KEY`
- `CRON_SECRET`

**Me:** Make sure the app uses App Router and TypeScript.

---

## 2. Core autonomous engine

**Me:** Create `lib/agentEngine.ts` with a `runAutonomousCycle(agentId: string)` function.

**AI:** I built a 5-step autonomous flow:
1. Topic discovery from live RSS feeds.
2. Memory and deduplication via Redis lists.
3. Editorial judgment using `groq`.
4. Content synthesis and rationale creation using `groq`.
5. Persistence of approved posts in Redis.

**Me:** Use `groq` for all AI prompts, not Gemini.

**AI:** Updated. The prompt flow now calls `groq` and expects strict JSON.

---

## 3. API routes

**Me:** Build the judge-facing API routes.

**AI:** I created:
- `app/api/agent/init/route.ts` (POST)
- `app/api/agent/feed/route.ts` (GET)
- `app/api/agent/cron/route.ts` (GET)

**Me:** The init route should save persona config, set `agent:current_active`, and trigger the first cycle.

**AI:** Done.

**Me:** The feed route should return `posts` ordered newest-first and fall back to the current active agent if `agentId` is missing.

**AI:** Done.

**Me:** The cron route should require the `CRON_SECRET` and run the autonomous cycle.

**AI:** Done.

---

## 4. Background automation

**Me:** Set up zero-human intervention scheduling.

**AI:** I added instructions for `vercel.json` cron configuration and a GitHub Actions workflow to call the cron endpoint every 30 minutes.

**Me:** Good. This proves the app can run by itself.

---

## 5. Dashboard / evaluator UI

**Me:** Build a judge-facing dashboard in `app/page.tsx`.

**AI:** I designed a dark glassmorphism dashboard with:
- agent status
- live feed cards
- rejection transparency
- example API curl commands

**Me:** Make the UI polished and easy to read, with neon cyan accents and blurred cards.

**AI:** Yes.

---

## 6. Pre-release checks

**Me:** I tested the system and found two issues:
1. RSS snippets have HTML tags.
2. `createdAt` must be ISO 8601 UTC.

**AI:** Fix them in `lib/agentEngine.ts`:
- strip HTML from RSS content before sending to `groq`
- use `new Date().toISOString()` for all timestamps
- enforce JSON response parsing

**Me:** Also make sure any `groq` requests are configured to return clean JSON.

**AI:** Done.

---

## Why this log matters

This file is intentionally written as a prompt/chat log.
It shows the iterative conversation I used to build the project, not just a final feature list.

If judges want, I can also add `CHAT-TRANSCRIPT.md` with a more direct export of the session text.
