/**
 * Antigravity execution verification: simulates 3 autonomous cron cycles locally.
 *
 * Run: npm run verify:cron
 *
 * Confirms new posts are appended to the feed on each cycle without human intervention.
 */
import { NextRequest } from 'next/server';
import { GET as cronGET } from '../app/api/agent/cron/route';
import { GET as feedGET } from '../app/api/agent/feed/route';
import { redis } from '../lib/redis';

const CRON_SECRET = 'hackathon_autonomous_secret_123';

process.env.CRON_SECRET = CRON_SECRET;
process.env.UPSTASH_REDIS_REST_URL = 'https://mock-redis.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token';
process.env.GEMINI_API_KEY = 'mock-gemini-key';

const redisDb = new Map<string, string[]>();
const redisStrings = new Map<string, string>();

function handleSingleCommand([cmd, ...args]: unknown[]): { result: unknown } {
  const cmdName = String(cmd).toLowerCase();
  if (cmdName === 'lrange') {
    const key = String(args[0]);
    const start = parseInt(String(args[1]), 10);
    const stop = parseInt(String(args[2]), 10);
    const list = redisDb.get(key) || [];
    const sliced = stop === -1 ? list.slice(start) : list.slice(start, stop + 1);
    return { result: sliced };
  }
  if (cmdName === 'lpush') {
    const key = String(args[0]);
    const values = args.slice(1).map(String);
    const list = redisDb.get(key) || [];
    redisDb.set(key, [...values.reverse(), ...list]);
    return { result: (redisDb.get(key) || []).length };
  }
  if (cmdName === 'set') {
    redisStrings.set(String(args[0]), String(args[1]));
    return { result: 'OK' };
  }
  if (cmdName === 'get') {
    return { result: redisStrings.get(String(args[0])) ?? null };
  }
  return { result: null };
}

const originalFetch = globalThis.fetch;
globalThis.fetch = async function (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const urlString = input.toString();

  if (urlString.includes('mock-redis.upstash.io')) {
    const bodyStr = init?.body ? init.body.toString() : '';
    const parsedBody = JSON.parse(bodyStr);
    const isPipeline = urlString.endsWith('/pipeline');
    const responseData = isPipeline
      ? parsedBody.map((c: unknown[]) => handleSingleCommand(c))
      : handleSingleCommand(parsedBody);
    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (urlString.includes('generativelanguage.googleapis.com')) {
    const bodyStr = init?.body ? init.body.toString() : '';
    const parsedBody = JSON.parse(bodyStr);
    const contents =
      parsedBody.contents?.parts?.[0]?.text ||
      parsedBody.contents?.[0]?.parts?.[0]?.text ||
      '';

    let geminiResponse = '{}';
    if (contents.includes('shouldPublish')) {
      geminiResponse = JSON.stringify({
        shouldPublish: true,
        rejectionReason: '',
      });
    } else {
      let candTitle = 'Candidate Article';
      const match = contents.match(/Title:\s*(.+)/i);
      if (match) candTitle = match[1].trim();
      geminiResponse = JSON.stringify({
        text: `Autonomous post about "${candTitle}" in AI Security.`,
        rationale: `Selected "${candTitle}" for its relevance to AI Security.`,
      });
    }

    return new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: geminiResponse }] } }],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const mockArticles = [
    {
      title: 'Prompt Injection Safeguards in LLM Core Models',
      link: 'https://hnrss.org/newest?q=AI#1',
      guid: 'https://hnrss.org/newest?q=AI#1',
    },
    {
      title: 'Multi-Agent Architectures Face Critical Authentication Breaches',
      link: 'https://techcrunch.com/category/artificial-intelligence/feed/#2',
      guid: 'https://techcrunch.com/category/artificial-intelligence/feed/#2',
    },
    {
      title: 'Securing the Vector Database Layer against Poisoning Attacks',
      link: 'https://dev.to/feed/tag/ai#3',
      guid: 'https://dev.to/feed/tag/ai#3',
    },
  ];

  if (
    urlString.includes('hnrss.org') ||
    urlString.includes('techcrunch.com') ||
    urlString.includes('dev.to')
  ) {
    const item =
      urlString.includes('hnrss.org')
        ? mockArticles[0]
        : urlString.includes('techcrunch.com')
          ? mockArticles[1]
          : mockArticles[2];

    const mockFeedXml = `
      <rss version="2.0">
        <channel>
          <title>Mock Feed</title>
          <item>
            <title>${item.title}</title>
            <link>${item.link}</link>
            <guid>${item.guid}</guid>
          </item>
        </channel>
      </rss>`;

    return new Response(mockFeedXml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  }

  return originalFetch(input, init);
};

async function initializeAgent(): Promise<string> {
  const agentId = `ada-agent-${Math.random().toString(16).substring(2, 6)}`;
  const persona = { name: 'Ada', domain: 'AI Security' };

  await redis.set(`agent:${agentId}:config`, JSON.stringify(persona));
  await redis.set('agent:current_active', agentId);

  return agentId;
}

async function triggerCron(cycleNumber: number) {
  const req = new NextRequest(
    `http://localhost:3000/api/agent/cron?secret=${CRON_SECRET}`
  );
  const res = await cronGET(req);
  const data = await res.json();

  if (res.status !== 200 || !data.success) {
    throw new Error(
      `Cron cycle ${cycleNumber} failed (${res.status}): ${JSON.stringify(data)}`
    );
  }

  console.log(`  Cycle ${cycleNumber}: published=${data.published}`);
  return data;
}

async function readFeed(agentId: string) {
  const feedReq = new NextRequest(
    `http://localhost:3000/api/agent/feed?agentId=${agentId}`
  );
  const feedRes = await feedGET(feedReq);
  return feedRes.json();
}

async function runVerification() {
  console.log('=== Antigravity Cron Loop Verification ===\n');

  const agentId = await initializeAgent();
  console.log(`Initialized agent: ${agentId}\n`);

  let previousCount = 0;

  for (let cycle = 1; cycle <= 3; cycle++) {
    console.log(`--- Cron execution cycle ${cycle} ---`);
    await triggerCron(cycle);

    const feed = await readFeed(agentId);
    const currentCount = feed.posts.length;

    if (currentCount <= previousCount) {
      throw new Error(
        `Cycle ${cycle} did not add a new post (before=${previousCount}, after=${currentCount})`
      );
    }

    console.log(`  Feed grew: ${previousCount} -> ${currentCount} posts\n`);
    previousCount = currentCount;
  }

  const finalFeed = await readFeed(agentId);

  if (finalFeed.posts.length !== 3) {
    throw new Error(`Expected 3 posts after 3 cron cycles, got ${finalFeed.posts.length}`);
  }

  const newest = new Date(finalFeed.posts[0].createdAt).getTime();
  const oldest = new Date(finalFeed.posts[2].createdAt).getTime();
  if (newest < oldest) {
    throw new Error('Feed is not sorted newest-first by createdAt.');
  }

  console.log('Final feed:');
  finalFeed.posts.forEach((post: { id: string; text: string }, index: number) => {
    console.log(`  [${index + 1}] ${post.id}: ${post.text}`);
  });

  console.log(
    '\nSUCCESS: 3 cron cycles completed autonomously; feed grew to 3 posts without human intervention.'
  );
}

runVerification().catch((error) => {
  console.error('\nVERIFICATION FAILED:', error);
  process.exit(1);
});
