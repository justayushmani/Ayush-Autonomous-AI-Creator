import Parser from 'rss-parser';
import { redis } from './redis';
import { queryGroq } from './groq';

export interface Persona {
  name: string;
  domain: string;
}

export interface Post {
  id: string;
  createdAt: string;
  text: string;
  rationale: string;
  sources: string[];
  sourceTitle: string; // Stored to facilitate future topic/title deduplication
}

export interface RejectedTopic {
  title: string;
  reason: string;
  url: string;
  rejectedAt: string;
}

export interface AgentResult {
  success: boolean;
  status: 'no_articles' | 'rejected' | 'published' | 'error';
  post?: Post;
  rejectedTopic?: RejectedTopic;
  error?: string;
}

const parser = new Parser();

export async function runAgentEngine(
  agentId: string,
  persona: Persona
): Promise<AgentResult> {
  try {
    // ==========================================
    // STEP 1: TOPIC DISCOVERY
    // ==========================================
    const feeds = [
      { name: 'HackerNews AI', url: 'https://hnrss.org/newest?q=AI' },
      { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
      { name: 'Dev.to AI', url: 'https://dev.to/feed/tag/ai' },
    ];

    const discoveredArticles: Array<{ title: string; url: string }> = [];

    for (const feed of feeds) {
      try {
        const parsed = await parser.parseURL(feed.url);
        if (parsed.items) {
          for (const item of parsed.items) {
            if (item.title && (item.link || item.guid)) {
              discoveredArticles.push({
                title: item.title,
                url: item.link || item.guid || '',
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching or parsing feed "${feed.name}" (${feed.url}):`, error);
      }
    }

    if (discoveredArticles.length === 0) {
      return {
        success: false,
        status: 'no_articles',
        error: 'No articles could be retrieved from any of the RSS feeds.',
      };
    }

    // ==========================================
    // STEP 2: MEMORY & DEDUPLICATION
    // ==========================================
    const postsKey = `agent:${agentId}:posts`;
    const rejectedKey = `agent:${agentId}:rejected`;

    // Fetch memory histories from Redis
    const [rawPosts, rawRejected] = await Promise.all([
      redis.lrange<string>(postsKey, 0, 19),
      redis.lrange<string>(rejectedKey, 0, 29),
    ]);

    // Parse posts safely
    const publishedPosts: Post[] = (rawPosts || [])
      .map((item) => {
        try {
          return typeof item === 'string' ? JSON.parse(item) : item;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    // Parse rejected topics safely
    const rejectedTopics: RejectedTopic[] = (rawRejected || [])
      .map((item) => {
        try {
          return typeof item === 'string' ? JSON.parse(item) : item;
        } catch {
          if (typeof item === 'string') {
            return { title: item, reason: 'Legacy rejection string', url: '', rejectedAt: new Date().toISOString() };
          }
          return null;
        }
      })
      .filter(Boolean);

    // Deduplicate candidate articles
    const filteredCandidates = discoveredArticles.filter((candidate) => {
      const candidateTitle = candidate.title.trim().toLowerCase();
      const candidateUrl = candidate.url.trim().toLowerCase();

      if (!candidateTitle) return false;

      // Check overlap with published posts
      const isPublished = publishedPosts.some((post) => {
        const postTitle = (post.sourceTitle || '').trim().toLowerCase();
        const postUrl = (post.sources && post.sources[0] || '').trim().toLowerCase();
        return candidateTitle === postTitle || candidateUrl === postUrl;
      });

      if (isPublished) return false;

      // Check overlap with rejected topics
      const isRejected = rejectedTopics.some((rejected) => {
        const rejectedTitle = (rejected.title || '').trim().toLowerCase();
        const rejectedUrl = (rejected.url || '').trim().toLowerCase();
        return candidateTitle === rejectedTitle || (rejectedUrl && candidateUrl === rejectedUrl);
      });

      if (isRejected) return false;

      return true;
    });

    if (filteredCandidates.length === 0) {
      return {
        success: true,
        status: 'no_articles',
        error: 'All discovered articles are already in memory (published or rejected).',
      };
    }

    // ==========================================
    // STEP 3: EDITORIAL JUDGMENT
    // ==========================================
    const topCandidate = filteredCandidates[0];

    // Format memory histories for prompt context
    const publishedContext = publishedPosts
      .map((p, idx) => `${idx + 1}. Title: "${p.sourceTitle || 'Unknown'}" | Post Content: "${p.text.substring(0, 80)}..."`)
      .join('\n') || 'No posts published yet.';

    const rejectedContext = rejectedTopics
      .map((r, idx) => `${idx + 1}. Title: "${r.title}" | Reason: ${r.reason}`)
      .join('\n') || 'No topics rejected yet.';

    const editorialPrompt = `
You are the Editorial Director for an autonomous agent named "${persona.name}" specializing in the domain of "${persona.domain}".
Evaluate if the following candidate article is relevant, high-quality, and interesting enough to write about for your audience.

Target Domain: ${persona.domain}

Candidate Article:
- Title: ${topCandidate.title}
- URL: ${topCandidate.url}

Recent Published Posts (for context):
${publishedContext}

Recent Rejected Topics (for context):
${rejectedContext}

Guidelines for Editorial Judgment:
1. The article MUST be highly relevant and technically aligned with "${persona.domain}".
2. Do not write about the same topics or specific news that have recently been published.
3. Reject clickbait, generic tutorials, or low-quality articles.
4. Set "shouldPublish" to true if approved. Otherwise, set "shouldPublish" to false and provide a clear "rejectionReason".
5. Return the result strictly as a JSON object matching this schema:
   {
     "shouldPublish": boolean,
     "rejectionReason": string
   }
`;

    const editorialResponseText = await queryGroq(editorialPrompt);

    let editorialResult: { shouldPublish: boolean; rejectionReason: string };
    try {
      editorialResult = JSON.parse(editorialResponseText);
    } catch {
      throw new Error(`Failed to parse editorial response JSON: ${editorialResponseText}`);
    }

    if (!editorialResult.shouldPublish) {
      const rejectedItem: RejectedTopic = {
        title: topCandidate.title,
        reason: editorialResult.rejectionReason,
        url: topCandidate.url,
        rejectedAt: new Date().toISOString(),
      };

      // Store in Redis rejected list
      await redis.lpush(rejectedKey, JSON.stringify(rejectedItem));

      return {
        success: true,
        status: 'rejected',
        rejectedTopic: rejectedItem,
      };
    }

    // ==========================================
    // STEP 4: CONTENT SYNTHESIS & RATIONALE
    // ==========================================
    // Provide up to 5 other candidates for comparison
    const otherCandidatesContext = filteredCandidates
      .slice(1, 6)
      .map((c, idx) => `${idx + 1}. Title: "${c.title}" (URL: ${c.url})`)
      .join('\n') || 'None';

    const synthesisPrompt = `
You are "${persona.name}", an autonomous agent specializing in "${persona.domain}".
You have approved the following article for synthesis:
- Title: ${topCandidate.title}
- URL: ${topCandidate.url}

Here are other candidate articles that were considered but not chosen:
${otherCandidatesContext}

Task:
1. Write a sharp, technical, and domain-focused social media post based on the approved article.
   - Maintain a highly professional and insightful voice suited for an industry thought leader.
   - Focus on key takeaways, architecture, or industry impact.
   - Do NOT use generic hashtags or overly enthusiastic marketing language.
2. Provide a detailed rationale explaining:
   - Why this specific article was selected.
   - Why it is relevant now.
   - Why it was chosen over the other candidates.
3. Return the result strictly as a JSON object matching this schema:
   {
     "text": string,
     "rationale": string
   }
`;

    const synthesisResponseText = await queryGroq(synthesisPrompt);

    let synthesisResult: { text: string; rationale: string };
    try {
      synthesisResult = JSON.parse(synthesisResponseText);
    } catch {
      throw new Error(`Failed to parse synthesis response JSON: ${synthesisResponseText}`);
    }

    // ==========================================
    // STEP 5: PERSISTENCE
    // ==========================================
    const randomId = Math.random().toString(36).substring(2, 11);
    const post: Post = {
      id: `p_${randomId}`,
      createdAt: new Date().toISOString(),
      text: synthesisResult.text,
      rationale: synthesisResult.rationale,
      sources: [topCandidate.url],
      sourceTitle: topCandidate.title,
    };

    // Prepend to posts list in Redis and save active agent ID
    await redis.lpush(postsKey, JSON.stringify(post));
    await redis.set('agent:active_id', agentId);

    return {
      success: true,
      status: 'published',
      post,
    };
  } catch (error: unknown) {
    console.error('Error occurred in agent engine execution:', error);
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      status: 'error',
      error: message,
    };
  }
}

export async function runAutonomousCycle(agentId: string): Promise<AgentResult> {
  const configKey = `agent:${agentId}:config`;
  const rawConfig = await redis.get<string | object>(configKey);
  if (!rawConfig) {
    throw new Error(`No persona configuration found for agent ${agentId}`);
  }
  const persona = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : (rawConfig as Persona);
  return runAgentEngine(agentId, persona);
}

