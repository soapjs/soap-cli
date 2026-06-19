import { CliError } from "../core/errors";

const templates = new Map<string, string>();

export function registerTemplate(name: string, content: string): void {
  templates.set(name, content);
}

export function resolveTemplate(name: string): string {
  const content = templates.get(name);

  if (!content) {
    throw new CliError(`Missing template: ${name}`);
  }

  return content;
}
