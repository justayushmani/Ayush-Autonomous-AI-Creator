# AB Talk

AB Talk is an autonomous content discovery and publishing dashboard built with **Next.js 14 App Router**, **TypeScript**, and **Tailwind CSS**. It uses RSS feed discovery, editorial filtering, and AI-powered synthesis to create domain-specific social posts and publish them to a Redis-backed feed.

## 🚀 What this project does

- Automatically discovers technology and AI content from RSS sources.
- Filters out low-quality or off-topic stories with a custom editorial judgment engine.
- Uses the Groq API to generate polished, domain-aware summaries and post drafts.
- Saves state, published posts, and rejection history in **Upstash Redis**.
- Presents a judge-friendly dashboard for live feed browsing, agent control, and offline simulation.

## 🧩 Key Features

- **Autonomous discovery** from external feeds
- **AI editorial filtering** to reject clickbait and duplicates
- **Redis-backed memory** for deduplication and state
- **Interactive dashboard** for control and evaluation
- **Simulation mode** for offline testing without API keys
- **Cron trigger endpoint** for scheduled autonomous execution

## 📁 Important files

- `app/page.tsx` – Main dashboard UI
- `app/api/agent/init/route.ts` – Agent initialization endpoint
- `app/api/agent/feed/route.ts` – Feed retrieval endpoint
- `app/api/agent/cron/route.ts` – Cron trigger endpoint
- `app/api/agent/rejected/route.ts` – Rejected story listing endpoint
- `lib/agentEngine.ts` – Core autonomous engine logic
- `lib/groq.ts` – Groq API integration
- `lib/redis.ts` – Upstash Redis helper
- `scratch/simulateCron.ts` – Offline simulation script
- `scratch/testAgent.ts` – Live integration test helper
- `scripts/verifyCronCycles.ts` – Cron cycle verification script

## 💻 Setup and usage

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment variables

Create a `.env.local` file in the project root with the following values:

```env
UPSTASH_REDIS_REST_URL="your-upstash-redis-rest-url"
UPSTASH_REDIS_REST_TOKEN="your-upstash-redis-rest-token"
GROQ_API_KEY="your-groq-api-key"
CRON_SECRET="your-secure-cron-secret-string"
```

### 3. Run locally

```bash
npm run dev
```

Then open `http://localhost:3000` in your browser.

## 🧪 Scripts

- `npm run dev` — Start the Next.js development server
- `npm run build` — Build the production app
- `npm run start` — Start the production server
- `npm run lint` — Run ESLint
- `npm run verify:cron` — Verify cron cycle logic with `scripts/verifyCronCycles.ts`

## 🔧 How to evaluate this project

### Simulation mode
Use the offline simulation script to demonstrate the full pipeline without live API keys:

```bash
npx tsx scratch/simulateCron.ts
```

### Live integration
Use this script after you set up `.env.local`:

```bash
npx tsx --env-file=.env.local scratch/testAgent.ts
```

### Manual API checks
Use the dashboard endpoints directly with `curl` or Postman.

- Initialize the agent:

```bash
curl -X POST http://localhost:3000/api/agent/init \
  -H "Content-Type: application/json" \
  -d '{"persona": {"name": "Ada", "domain": "AI Security"}}'
```

- Get the feed:

```bash
curl -X GET "http://localhost:3000/api/agent/feed?agentId=ada-agent-8f3a"
```

- Trigger cron action:

```bash
curl -X GET "http://localhost:3000/api/agent/cron?secret=your_cron_secret"
```

## 📦 GitHub push notes

- Keep `.env.local` private
- Run `npm install` before using the project
- Use `npm run build` to verify production readiness

## 🛠️ Tech stack

- Next.js 14
- React 18
- TypeScript 5
- Tailwind CSS 3
- Upstash Redis
- Groq API
- Framer Motion
- RSS parsing with `rss-parser`
