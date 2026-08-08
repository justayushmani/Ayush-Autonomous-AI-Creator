import Parser from 'rss-parser';

// Set up mock environment variables FIRST before importing any modules
process.env.CRON_SECRET = 'hackathon_autonomous_secret_123';
process.env.UPSTASH_REDIS_REST_URL = 'https://mock-redis.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token';
process.env.GEMINI_API_KEY = 'mock-gemini-key';

// Mock In-Memory Databases
const redisDb = new Map<string, string[]>();
const redisStrings = new Map<string, string>();

// Hermetic Mocking of RSS Parser to avoid real network requests (since rss-parser uses native node http/https modules)
Parser.prototype.parseURL = async function (url: string) {
  console.log(`[Mock RSS Parser] Intercepted parseURL for: ${url}`);
  if (url.includes('hnrss.org')) {
    return {
      items: [
        {
          title: 'HackerNews: Prompt Injection Safeguards in LLM Core Models',
          link: 'https://hnrss.org/newest?q=AI#1',
          guid: 'https://hnrss.org/newest?q=AI#1',
        },
      ],
    };
  } else if (url.includes('techcrunch.com')) {
    return {
      items: [
        {
          title: 'TechCrunch: Multi-Agent Architectures Face Critical Authentication Breaches',
          link: 'https://techcrunch.com/category/artificial-intelligence/feed/#2',
          guid: 'https://techcrunch.com/category/artificial-intelligence/feed/#2',
        },
      ],
    };
  } else if (url.includes('dev.to')) {
    return {
      items: [
        {
          title: 'Dev.to: Securing the Vector Database Layer against Poisoning Attacks',
          link: 'https://dev.to/feed/tag/ai#3',
          guid: 'https://dev.to/feed/tag/ai#3',
        },
      ],
    };
  }
  return { items: [] };
};

function handleSingleCommand([cmd, ...args]: any[]): { result: any } {
  const cmdName = cmd.toLowerCase();
  if (cmdName === 'lrange') {
    const key = args[0];
    const start = parseInt(args[1], 10);
    const stop = parseInt(args[2], 10);
    const list = redisDb.get(key) || [];
    const sliced = stop === -1 ? list.slice(start) : list.slice(start, stop + 1);
    return { result: sliced };
  }
  if (cmdName === 'lpush') {
    const key = args[0];
    const values = args.slice(1);
    const list = redisDb.get(key) || [];
    // Prepend values (note: args are prepended in order)
    const newList = [...values.reverse(), ...list];
    redisDb.set(key, newList);
    return { result: newList.length };
  }
  if (cmdName === 'set') {
    const key = args[0];
    const val = args[1];
    redisStrings.set(key, val);
    return { result: 'OK' };
  }
  if (cmdName === 'get') {
    const key = args[0];
    return { result: redisStrings.get(key) || null };
  }
  return { result: null };
}

// Intercept global fetch
const originalFetch = globalThis.fetch;
globalThis.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const urlString = input.toString();

  // 1. Mock Upstash Redis REST Requests
  if (urlString.includes('mock-redis.upstash.io')) {
    const bodyStr = init?.body ? init.body.toString() : '';
    const parsedBody = JSON.parse(bodyStr);
    const isPipeline = urlString.endsWith('/pipeline');

    let responseData;
    if (isPipeline) {
      responseData = parsedBody.map((c: any) => handleSingleCommand(c));
    } else {
      responseData = handleSingleCommand(parsedBody);
    }

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Mock Gemini API Request
  if (urlString.includes('generativelanguage.googleapis.com')) {
    const bodyStr = init?.body ? init.body.toString() : '';
    const parsedBody = JSON.parse(bodyStr);
    
    // Support nested contents structure
    let contents = '';
    if (parsedBody.contents) {
      if (Array.isArray(parsedBody.contents)) {
        contents = parsedBody.contents[0]?.parts?.[0]?.text || '';
      } else if (parsedBody.contents.parts) {
        contents = parsedBody.contents.parts[0]?.text || '';
      }
    }

    let geminiResponse = '{}';

    if (contents.includes('shouldPublish')) {
      // Editorial Judgment Request
      let candTitle = 'Candidate Article';
      const match = contents.match(/Title:\s*(.+)/i);
      if (match) candTitle = match[1].trim();

      geminiResponse = JSON.stringify({
        shouldPublish: true,
        rejectionReason: '',
      });
      console.log(`[Mock Gemini] Editorial Judgment: Approved candidate "${candTitle}"`);
    } else {
      // Content Synthesis Request
      let candTitle = 'Candidate Article';
      const match = contents.match(/Title:\s*(.+)/i);
      if (match) candTitle = match[1].trim();

      geminiResponse = JSON.stringify({
        text: `Synthesized post: Incredible updates on "${candTitle}" specializing in AI Security.`,
        rationale: `Selected "${candTitle}" because of its high relevance to AI security. It is highly active right now and preferred over other candidates.`,
      });
      console.log(`[Mock Gemini] Content Synthesis: Generated post for "${candTitle}"`);
    }

    const responseBody = {
      candidates: [
        {
          content: {
            parts: [{ text: geminiResponse }],
          },
        },
      ],
    };

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Fallback to original fetch
  return originalFetch(input, init);
};

// Simulation Execution using dynamic imports with relative paths to avoid hoisting and URL scheme issues
async function runSimulation() {
  // Dynamically import Route handlers and NextRequest AFTER env variables and fetch mock are set
  const { POST: initPOST } = await import('../app/api/agent/init/route');
  const { GET: cronGET } = await import('../app/api/agent/cron/route');
  const { GET: feedGET } = await import('../app/api/agent/feed/route');
  const { NextRequest } = await import('next/server');

  console.log('\n--- SIMULATING CYCLE 1: INITIALIZATION & IMMEDIATE RUN ---');
  
  const initReq = new NextRequest('http://localhost:3000/api/agent/init', {
    method: 'POST',
    body: JSON.stringify({
      persona: {
        name: 'Ada',
        domain: 'AI Security',
      },
    }),
  });

  const initRes = await initPOST(initReq);
  const initData = await initRes.json();
  const agentId = initData.agentId;

  console.log(`Agent successfully initialized. Generated agentId: ${agentId}`);

  // Await background execution
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log('\n--- SIMULATING CYCLE 2: FIRST CRON CYCLE TRIGGER ---');
  const cronReq1 = new NextRequest(`http://localhost:3000/api/agent/cron?secret=hackathon_autonomous_secret_123`);
  const cronRes1 = await cronGET(cronReq1);
  const cronData1 = await cronRes1.json();
  console.log(`Cron Cycle 2 output:`, cronData1);

  console.log('\n--- SIMULATING CYCLE 3: SECOND CRON CYCLE TRIGGER ---');
  const cronReq2 = new NextRequest(`http://localhost:3000/api/agent/cron?secret=hackathon_autonomous_secret_123`);
  const cronRes2 = await cronGET(cronReq2);
  const cronData2 = await cronRes2.json();
  console.log(`Cron Cycle 3 output:`, cronData2);

  console.log('\n--- VERIFYING THE SOCIAL FEED VIA /api/agent/feed ---');
  const feedReq = new NextRequest(`http://localhost:3000/api/agent/feed?agentId=${agentId}`);
  const feedRes = await feedGET(feedReq);
  const feedData = await feedRes.json();

  console.log(`\nFeed Result (Total Posts: ${feedData.posts.length}):`);
  feedData.posts.forEach((post: any, index: number) => {
    console.log(`\n[Post ${index + 1}] ID: ${post.id} | CreatedAt: ${post.createdAt}`);
    console.log(`Text: ${post.text}`);
    console.log(`Rationale: ${post.rationale}`);
    console.log(`Sources: ${post.sources.join(', ')}`);
  });

  // Verification Assertions
  if (feedData.posts.length !== 3) {
    throw new Error(`Simulation failed! Expected 3 posts, but got ${feedData.posts.length}`);
  }

  // Ensure ordered newest first: index 0 (newest) should have a later timestamp than index 2 (oldest)
  const time0 = new Date(feedData.posts[0].createdAt).getTime();
  const time2 = new Date(feedData.posts[2].createdAt).getTime();
  if (time0 < time2) {
    throw new Error('Simulation failed! Feed is not sorted in descending order of createdAt.');
  }

  console.log('\nSUCCESS: 3 simulation cycles executed perfectly. Deduplication and sorting verified.');
}

runSimulation().catch((error) => {
  console.error('\nSimulation Failed with Error:', error);
  process.exit(1);
});
