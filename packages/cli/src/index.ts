#!/usr/bin/env node
/**
 * XMultiverse CLI — Entry point
 * Tập lệnh cho AI agent và người dùng tương tác với XMultiverse qua command line.
 */

import { parseArgs } from './args.js';
import { setMode, setVerbose, emit, info } from './feedback.js';
import { HELP_TEXT } from './commands/help.js';
import { cmdHealth } from './commands/health.js';
import { cmdStart, cmdStop, cmdStatus } from './commands/server.js';
import { cmdWorldCreate, cmdWorldList, cmdWorldGet } from './commands/world.js';
import { cmdPlayerCreate, cmdPlayerList } from './commands/player.js';
import { cmdAct, cmdHistory } from './commands/roleplay.js';
import { cmdEventAdd } from './commands/event.js';
import { cmdDoctor } from './commands/doctor.js';

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  if (argv.length === 0) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  // Global flags
  const jsonMode = argv.includes('--json');
  if (jsonMode) {
    setMode('json');
    argv.splice(argv.indexOf('--json'), 1);
  }
  if (argv.includes('--verbose') || argv.includes('-v')) {
    setVerbose(true);
    const idx = argv.indexOf('--verbose');
    if (idx >= 0) argv.splice(idx, 1);
    const idx2 = argv.indexOf('-v');
    if (idx2 >= 0) argv.splice(idx2, 1);
  }

  const { positional, flags } = parseArgs(argv);
  const command = positional[0];
  const subcommand = positional[1];

  // Log what we're about to do (goes to stderr in JSON mode)
  if (!jsonMode) {
    info(`Lệnh: ${command}${subcommand ? ' ' + subcommand : ''}`);
  } else {
    process.stderr.write(`[cmd] ${command}${subcommand ? ' ' + subcommand : ''}\n`);
  }

  try {
    switch (command) {
      case 'help':
      case '--help':
      case '-h':
        console.log(HELP_TEXT);
        break;

      case 'doctor':
        await cmdDoctor();
        break;

      case 'start':
        await cmdStart();
        break;

      case 'stop':
        await cmdStop();
        break;

      case 'status':
        await cmdStatus();
        break;

      case 'health':
        await cmdHealth();
        break;

      case 'world':
        switch (subcommand) {
          case 'create':
            await cmdWorldCreate(flags);
            break;
          case 'list':
            await cmdWorldList();
            break;
          case 'get':
            await cmdWorldGet(flags);
            break;
          default:
            console.error('Dùng: xmv world <create|list|get>');
            console.error('Chạy "xmv help" để xem hướng dẫn.');
            process.exit(1);
        }
        break;

      case 'player':
        switch (subcommand) {
          case 'create':
            await cmdPlayerCreate(flags);
            break;
          case 'list':
            await cmdPlayerList(flags);
            break;
          default:
            console.error('Dùng: xmv player <create|list>');
            console.error('Chạy "xmv help" để xem hướng dẫn.');
            process.exit(1);
        }
        break;

      case 'act':
        await cmdAct(flags);
        break;

      case 'history':
        await cmdHistory(flags);
        break;

      case 'event':
        switch (subcommand) {
          case 'add':
            await cmdEventAdd(flags);
            break;
          default:
            console.error('Dùng: xmv event <add>');
            console.error('Chạy "xmv help" để xem hướng dẫn.');
            process.exit(1);
        }
        break;

      default:
        emit('cli', false, `Lệnh không xác định: "${command}".`, undefined, {
          missing: [`Lệnh "${command}" không tồn tại`],
          nextSteps: ['Chạy: xmv help để xem tất cả lệnh'],
        });
        process.exit(1);
    }
  } catch (err: any) {
    emit('cli', false, `Lỗi không mong đợi: ${err.message}`, undefined, {
      missing: [err.message],
      nextSteps: ['Chạy: xmv doctor để chẩn đoán', 'Chạy: xmv help để xem hướng dẫn'],
    });
    process.exit(1);
  }
}

main();
