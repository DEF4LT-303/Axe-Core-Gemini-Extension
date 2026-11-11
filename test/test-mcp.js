import { spawn } from 'child_process';

const p = spawn('node', ['dist/index.js'], { stdio: ['pipe', 'pipe', 'inherit'] });

let buffer = '';

p.stdout.on('data', (chunk) => {
  buffer += chunk.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop() ?? '';

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      console.log('Received response from MCP server:');
      console.log(JSON.stringify(msg, null, 2));

      if (msg.id === 1) {
        // Initialized! Now request tools/list
        const listToolsRequest = {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
          params: {}
        };
        p.stdin.write(JSON.stringify(listToolsRequest) + '\n');
      } else if (msg.id === 2) {
        console.log('\nSUCCESS! Tools discovered:');
        for (const tool of msg.result.tools) {
          console.log(`- ${tool.name}: ${tool.description}`);
        }

        console.log('\nCalling audit_html via MCP protocol...');
        const callToolRequest = {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'audit_html',
            arguments: {
              html: '<button style="color: #eee; background: #fff;">Unreadable</button>'
            }
          }
        };
        p.stdin.write(JSON.stringify(callToolRequest) + '\n');
      } else if (msg.id === 3) {
        console.log('\nSUCCESS! Tool call response received:');
        const content = JSON.parse(msg.result.content[0].text);
        console.log(`Audit target: ${content.target}`);
        console.log(`Status: ${content.status}`);
        console.log(`Violations: ${content.summary.violations}`);
        for (const v of content.violations) {
          console.log(`- [${v.impact.toUpperCase()}] ${v.id}: ${v.help}`);
        }
        p.kill();
        process.exit(0);
      }
    } catch (e) {
      console.log('Raw line:', line);
    }
  }
});

const initRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' }
  }
};

p.stdin.write(JSON.stringify(initRequest) + '\n');

setTimeout(() => {
  console.error('Timeout waiting for MCP response');
  p.kill();
  process.exit(1);
}, 10000);
