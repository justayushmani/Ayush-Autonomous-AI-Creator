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
      return NextResponse.json({ rejected: [] }, { status: 200 });
    }

    const rejectedKey = `agent:${agentId}:rejected`;
    const rawRejected = await redis.lrange<string>(rejectedKey, 0, -1);

    if (!rawRejected || rawRejected.length === 0) {
      return NextResponse.json({ rejected: [] }, { status: 200 });
    }

    // Parse rejected topics
    const rejected = rawRejected.map((item) => {
      try {
        const parsed = typeof item === 'string' ? JSON.parse(item) : item;
        return {
          title: parsed.title,
          reason: parsed.reason,
          url: parsed.url || '',
          rejectedAt: parsed.rejectedAt || new Date().toISOString(),
        };
      } catch {
        if (typeof item === 'string') {
          return {
            title: item,
            reason: 'Unknown editorial criteria.',
            url: '',
            rejectedAt: new Date().toISOString(),
          };
        }
        return null;
      }
    }).filter(Boolean);

    return NextResponse.json({ rejected }, { status: 200 });
  } catch (error: any) {
    console.error('Error in agent rejected API:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
