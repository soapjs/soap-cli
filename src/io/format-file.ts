export function formatFile(filePath: string, content: string): string {
  if (filePath.endsWith(".json")) {
    return `${JSON.stringify(JSON.parse(content), null, 2)}\n`;
  }

  if (filePath.endsWith(".md") || filePath.endsWith(".ts") || filePath.endsWith(".js")) {
    return content.endsWith("\n") ? content : `${content}\n`;
  }

  return content.endsWith("\n") ? content : `${content}\n`;
}
