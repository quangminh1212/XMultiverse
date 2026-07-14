/**
 * Comprehensive integration test for XMultiverse CLI.
 * Runs on the remote machine, tests all commands end-to-end.
 *
 * Usage: node scripts/remote-test.js
 */
import { spawnSync } from 'child_process';
import { existsSync, unlinkSync } from 'fs';

const PASS = [];
const FAIL = [];

/**
 * Run the CLI with given args. Returns { stdout, stderr, status }.
 * Uses node --import tsx directly to avoid npx.cmd shell issues on Windows.
 */
function runCli(args, opts = {}) {
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', 'packages/cli/src/index.ts', ...args],
    {
      cwd: process.cwd(),
      encoding: 'utf-8',
      timeout: 60000,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
      windowsHide: true,
      ...opts,
    },
  );
  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: result.status !== null ? result.status : 1,
  };
}

/**
 * Run CLI with --json flag and extract the emit() JSON object from stdout.
 * The emit() output is pretty-printed JSON with an "ok" field.
 * printData() also outputs JSON, so we need to find the first complete JSON object.
 */
function runCliJson(args) {
  const result = runCli([...args, '--json']);
  const stdout = result.stdout;

  // Find the first complete JSON object in stdout
  // It starts with { and we need to match braces to find the end
  const startIdx = stdout.indexOf('{');
  if (startIdx === -1) return { result: null, raw: result };

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = startIdx; i < stdout.length; i++) {
    const ch = stdout[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        const jsonStr = stdout.slice(startIdx, i + 1);
        try {
          const obj = JSON.parse(jsonStr);
          if (obj && typeof obj.ok === 'boolean') {
            return { result: obj, raw: result };
          }
        } catch {
          /* not valid JSON, try next */
        }
        // Try finding the next JSON object
        const nextStart = stdout.indexOf('{', i + 1);
        if (nextStart === -1) break;
        // Restart from next object
        return runCliJsonParseFrom(stdout, nextStart, result);
      }
    }
  }
  return { result: null, raw: result };
}

function runCliJsonParseFrom(stdout, startIdx, raw) {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = startIdx; i < stdout.length; i++) {
    const ch = stdout[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        const jsonStr = stdout.slice(startIdx, i + 1);
        try {
          const obj = JSON.parse(jsonStr);
          if (obj && typeof obj.ok === 'boolean') {
            return { result: obj, raw };
          }
        } catch {
          /* not valid JSON */
        }
        const nextStart = stdout.indexOf('{', i + 1);
        if (nextStart === -1) break;
        return runCliJsonParseFrom(stdout, nextStart, raw);
      }
    }
  }
  return { result: null, raw };
}

function test(name, condition, detail = '') {
  if (condition) {
    console.log(`  [PASS] ${name}`);
    PASS.push(name);
  } else {
    console.log(`  [FAIL] ${name}${detail ? ' — ' + detail : ''}`);
    FAIL.push(name);
  }
}

console.log('============================================');
console.log('  XMultiverse CLI - Integration Test');
console.log('============================================\n');

// Setup: stop any existing backend
console.log('[SETUP] Stopping any existing backend...');
runCli(['stop']);
if (existsSync('data/.xmv-backend.pid')) {
  try {
    unlinkSync('data/.xmv-backend.pid');
  } catch {
    /* ignore */
  }
}

// TEST 1: doctor (before backend starts)
console.log('\n=== TEST 1: doctor (backend down) ===');
{
  const { result, raw } = runCliJson(['doctor']);
  test('doctor runs', result !== null);
  test(
    'doctor detects backend down',
    result && result.checklist && result.checklist.some((c) => c.name === 'Backend' && !c.ok),
  );
}

// TEST 2: start
console.log('\n=== TEST 2: start ===');
{
  const { result, raw } = runCliJson(['start']);
  test('start succeeds', result && result.ok === true);
  test('start returns PID', result && result.data && typeof result.data.pid === 'number');
}

// TEST 3: health
console.log('\n=== TEST 3: health ===');
{
  const { result, raw } = runCliJson(['health']);
  test('health succeeds', result && result.ok === true);
  test('health returns ok status', result && result.data && result.data.status === 'ok');
}

// TEST 4: status
console.log('\n=== TEST 4: status ===');
{
  const { result, raw } = runCliJson(['status']);
  test('status succeeds', result && result.ok === true);
  test('status reports running', result && result.data && result.data.running === true);
}

// TEST 5: world create
console.log('\n=== TEST 5: world create ===');
let WORLD_ID = '';
{
  const { result, raw } = runCliJson([
    'world',
    'create',
    '--story',
    'Mot hiep si tim kiem thanh kiem than de danh bai quy vuong',
  ]);
  test('world create succeeds', result && result.ok === true);
  test('world create returns ID', result && result.data && result.data.id);
  if (result && result.data && result.data.id) {
    WORLD_ID = result.data.id;
    console.log(`  -> WORLD_ID = ${WORLD_ID}`);
  }
}

// TEST 6: world list
console.log('\n=== TEST 6: world list ===');
{
  const { result, raw } = runCliJson(['world', 'list']);
  test('world list succeeds', result && result.ok === true);
  test('world list count > 0', result && result.data && result.data.count > 0);
}

// TEST 7: world get
console.log('\n=== TEST 7: world get ===');
{
  if (WORLD_ID) {
    const { result, raw } = runCliJson(['world', 'get', '--id', WORLD_ID]);
    test('world get succeeds', result && result.ok === true);
    test('world get returns world data', result && result.data && result.data.name);
  } else {
    test('world get succeeds', false, 'no WORLD_ID');
  }
}

// TEST 8: player create
console.log('\n=== TEST 8: player create ===');
let PLAYER_ID = '';
{
  if (WORLD_ID) {
    const { result, raw } = runCliJson([
      'player',
      'create',
      '--world',
      WORLD_ID,
      '--name',
      'Kael',
      '--role',
      'Kiem si',
      '--backstory',
      'Lang dan bien mat',
      '--faction',
      'Hiep si Binh minh',
    ]);
    test('player create succeeds', result && result.ok === true);
    test('player create returns ID', result && result.data && result.data.id);
    if (result && result.data && result.data.id) {
      PLAYER_ID = result.data.id;
      console.log(`  -> PLAYER_ID = ${PLAYER_ID}`);
    }
  } else {
    test('player create succeeds', false, 'no WORLD_ID');
  }
}

// TEST 9: player list
console.log('\n=== TEST 9: player list ===');
{
  if (WORLD_ID) {
    const { result, raw } = runCliJson(['player', 'list', '--world', WORLD_ID]);
    test('player list succeeds', result && result.ok === true);
    test('player list count > 0', result && result.data && result.data.count > 0);
  } else {
    test('player list succeeds', false, 'no WORLD_ID');
  }
}

// TEST 10: act (explore)
console.log('\n=== TEST 10: act (explore) ===');
{
  if (PLAYER_ID) {
    const { result, raw } = runCliJson([
      'act',
      '--id',
      PLAYER_ID,
      '--action',
      'Tien vao rung sau Bong Dem',
    ]);
    test('act explore succeeds', result && result.ok === true);
    test('act explore returns scene', result && result.data && result.data.scene);
    test(
      'act explore returns choices',
      result && result.data && result.data.choices && result.data.choices.length > 0,
    );
  } else {
    test('act explore succeeds', false, 'no PLAYER_ID');
  }
}

// TEST 11: act (combat)
console.log('\n=== TEST 11: act (combat) ===');
{
  if (PLAYER_ID) {
    const { result, raw } = runCliJson(['act', '--id', PLAYER_ID, '--action', 'chien dau voi quy']);
    test('act combat succeeds', result && result.ok === true);
    test('act combat returns scene', result && result.data && result.data.scene);
  } else {
    test('act combat succeeds', false, 'no PLAYER_ID');
  }
}

// TEST 12: history
console.log('\n=== TEST 12: history ===');
{
  if (PLAYER_ID) {
    const { result, raw } = runCliJson(['history', '--id', PLAYER_ID]);
    test('history succeeds', result && result.ok === true);
    test('history count > 0', result && result.data && result.data.count > 0);
  } else {
    test('history succeeds', false, 'no PLAYER_ID');
  }
}

// TEST 13: event add
console.log('\n=== TEST 13: event add ===');
{
  if (WORLD_ID) {
    const { result, raw } = runCliJson([
      'event',
      'add',
      '--world',
      WORLD_ID,
      '--title',
      'Tran chien dau tien',
      '--desc',
      'Kael danh bai quay dau tien',
      '--year',
      '2024',
      '--important',
    ]);
    test('event add succeeds', result && result.ok === true);
    test(
      'event add returns totalEvents',
      result && result.data && typeof result.data.totalEvents === 'number',
    );
  } else {
    test('event add succeeds', false, 'no WORLD_ID');
  }
}

// TEST 14: Error - missing args
console.log('\n=== TEST 14: error - world create without story ===');
{
  const { raw } = runCliJson(['world', 'create']);
  test('error missing story exits non-zero', raw.status !== 0);
}

// TEST 15: Error - bad world ID
console.log('\n=== TEST 15: error - bad world ID ===');
{
  const { result, raw } = runCliJson(['world', 'get', '--id', 'nonexistent-id-12345']);
  test('error bad world id fails', result && result.ok === false);
}

// TEST 16: Error - bad player ID
console.log('\n=== TEST 16: error - bad player ID ===');
{
  const { result, raw } = runCliJson(['act', '--id', 'nonexistent-id-12345', '--action', 'test']);
  test('error bad player id fails', result && result.ok === false);
}

// TEST 17: stop
console.log('\n=== TEST 17: stop ===');
{
  const { result, raw } = runCliJson(['stop']);
  test('stop succeeds', result && result.ok === true);
}

// TEST 18: status after stop
console.log('\n=== TEST 18: status after stop ===');
{
  const { result, raw } = runCliJson(['status']);
  test('status after stop reports not running', result && result.ok === false);
}

// TEST 19: stop when already stopped
console.log('\n=== TEST 19: stop when already stopped ===');
{
  const { result, raw } = runCliJson(['stop']);
  test('stop when already stopped succeeds', result && result.ok === true);
}

// TEST 20: restart
console.log('\n=== TEST 20: restart ===');
{
  const { result, raw } = runCliJson(['start']);
  test('restart succeeds', result && result.ok === true);
}

// TEST 21: stop after restart
console.log('\n=== TEST 21: stop after restart ===');
{
  const { result, raw } = runCliJson(['stop']);
  test('stop after restart succeeds', result && result.ok === true);
}

// Summary
console.log('\n============================================');
console.log(`  RESULTS: ${PASS.length} passed, ${FAIL.length} failed`);
if (FAIL.length > 0) {
  console.log('  Failed tests:');
  FAIL.forEach((f) => console.log(`    - ${f}`));
}
console.log('============================================');

process.exit(FAIL.length > 0 ? 1 : 0);
