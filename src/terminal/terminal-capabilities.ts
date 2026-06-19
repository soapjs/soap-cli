export interface TerminalCapabilities {
  stdinIsTty: boolean;
  stdoutIsTty: boolean;
}

export function getTerminalCapabilities(): TerminalCapabilities {
  return {
    stdinIsTty: Boolean(process.stdin.isTTY),
    stdoutIsTty: Boolean(process.stdout.isTTY),
  };
}

export function canRunInteractiveMode(capabilities: TerminalCapabilities = getTerminalCapabilities()): boolean {
  return capabilities.stdinIsTty && capabilities.stdoutIsTty;
}
