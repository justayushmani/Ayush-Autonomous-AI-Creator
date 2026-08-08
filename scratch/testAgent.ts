import { runAgentEngine } from '../lib/agentEngine';

async function test() {
  console.log('Starting live agent engine test with real credentials...');
  const result = await runAgentEngine('live-test-agent', {
    name: 'Ada',
    domain: 'AI Security'
  });
  console.log('Agent run result:', JSON.stringify(result, null, 2));
}

test().catch(err => {
  console.error('Unhandled error in test:', err);
});
