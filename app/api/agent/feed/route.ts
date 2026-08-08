import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    let agentId = searchParams.get('agentId');

    // If agentId is omitted, fallback to reading agent:current_active from Redis
    if (!agentId) {
      agentId = await redis.get<string>('agent:current_active');
    }

    if (!agentId) {
      return NextResponse.json({ posts: [] }, { status: 200 });
    }

    const postsKey = `agent:${agentId}:posts`;
    const rawPosts = await redis.lrange<string>(postsKey, 0, -1);

    if (!rawPosts || rawPosts.length === 0) {
      return NextResponse.json({ posts: [] }, { status: 200 });
    }

    // Parse posts and ensure they conform to the Post structure
    const posts = rawPosts.map((item) => {
      try {
        const parsed = typeof item === 'string' ? JSON.parse(item) : item;
        return {
          id: parsed.id,
          createdAt: parsed.createdAt,
          text: parsed.text,
          rationale: parsed.rationale,
          sources: parsed.sources || [],
        };
      } catch {
        return null;
      }
    }).filter(Boolean);

    return NextResponse.json({ posts }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error in agent feed API:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
