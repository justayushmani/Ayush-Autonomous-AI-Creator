import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { runAutonomousCycle } from '@/lib/agentEngine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { persona } = body;

    if (!persona || !persona.name || !persona.domain) {
      return NextResponse.json(
        { error: 'Missing persona configuration. Expected name and domain.' },
        { status: 400 }
      );
    }

    // Generate unique agentId (e.g. namePrefix-agent-randomHex)
    const namePrefix = persona.name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 4) || 'agent';
    const randomHex = Math.random().toString(16).substring(2, 6);
    const agentId = `${namePrefix}-agent-${randomHex}`;

    const configKey = `agent:${agentId}:config`;
    const activeKey = 'agent:current_active';

    // Save configuration and set active agentId in Upstash Redis
    await redis.set(configKey, JSON.stringify(persona));
    await redis.set(activeKey, agentId);

    // Trigger the first immediate cycle in the background
    runAutonomousCycle(agentId).catch((err) => {
      console.error(`Background autonomous cycle failed for agent ${agentId}:`, err);
    });

    return NextResponse.json({ agentId }, { status: 200 });
  } catch (error: any) {
    console.error('Error in agent initialization API:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
