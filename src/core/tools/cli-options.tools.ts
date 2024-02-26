import { SchemaTools } from "../components/schema.tools";

export class CliOptionsTools {
  public static splitArrayOption(value: string[]): string[] {
    const parts = new Set<string>();

    if (Array.isArray(value)) {
      value.forEach((str) => {
        const list = SchemaTools.splitIgnoringBrackets(str, ",");
        list.forEach((item) => {
          if (item) {
            parts.add(item.trim());
          }
        });
      });
    }

    return [...parts];
  }
}
