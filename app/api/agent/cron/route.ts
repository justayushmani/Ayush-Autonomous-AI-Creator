import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { runAutonomousCycle } from '@/lib/agentEngine';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const searchParams = request.nextUrl.searchParams;
    const querySecret = searchParams.get('secret');

    const cronSecret = process.env.CRON_SECRET || 'hackathon_autonomous_secret_123';

    // Verify secret in query param or authorization header (with default fallback for dashboard testing)
    const defaultSecret = 'hackathon_autonomous_secret_123';
    let isAuthorized = false;
    if (querySecret === cronSecret || querySecret === defaultSecret) {
      isAuthorized = true;
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token === cronSecret || token === defaultSecret) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch active agentId from Redis
    const agentId = await redis.get<string>('agent:current_active');
    if (!agentId) {
      return NextResponse.json(
        { success: false, error: 'No active agent initialized. Call /api/agent/init first.' },
        { status: 400 }
      );
    }

    // Run autonomous cycle and await the result
    const result = await runAutonomousCycle(agentId);

    if (result.success) {
      return NextResponse.json(
        {
          success: true,
          published: result.status === 'published',
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to complete autonomous cycle.',
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error('Error in agent cron API:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
