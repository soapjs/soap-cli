import * as changeCase from "change-case";

export class Pattern {
  public static replace(
    pattern: string,
    replacements: { [key: string]: string }
  ): string {
    let value = pattern;
    const match = value.match(/{{\s*(\w+)\s+(\w+)\s*}}/g);

    if (Array.isArray(match)) {
      for (const m of match) {
        const [caseType, prop] = m.replace(/{{\s*|\s*}}/g, "").split(/\s+/);
        const useCase = caseType === "kebab" ? `paramCase` : `${caseType}Case`;

        if (replacements[prop] && changeCase[useCase]) {
          value = value.replace(m, changeCase[useCase](replacements[prop]));
        } else if (!replacements[prop]) {
          value = value.replace(m, "");
        }
      }
    }
    return value.replace(/[-]+/g, "-").replace(/\/-/g, "/");
  }
}
