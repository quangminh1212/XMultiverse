/** Shared argument parsing helpers. */

export interface ParsedArgs {
  positional: string[];
  flags: Record<string, string | boolean>;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { positional, flags };
}

export function requireArg(flags: Record<string, string | boolean>, key: string): string {
  const val = flags[key];
  if (!val || typeof val !== 'string') {
    console.error(`Thiếu --${key}. Chạy "xmv help" để xem hướng dẫn.`);
    process.exit(1);
  }
  return val;
}
