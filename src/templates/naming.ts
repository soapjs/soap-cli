import { paramCase, pascalCase, camelCase, snakeCase, constantCase } from "change-case";

export interface NameVariants {
  rawName: string;
  pascalName: string;
  camelName: string;
  kebabName: string;
  snakeName: string;
  constantName: string;
  pluralName: string;
}

export function pluralize(value: string): string {
  if (value.endsWith("s")) {
    return value;
  }

  if (value.endsWith("y") && !/[aeiou]y$/i.test(value)) {
    return `${value.slice(0, -1)}ies`;
  }

  if (/(s|x|z|ch|sh)$/i.test(value)) {
    return `${value}es`;
  }

  return `${value}s`;
}

export function createNameVariants(name: string): NameVariants {
  const kebabName = paramCase(name);

  return {
    rawName: name,
    pascalName: pascalCase(name),
    camelName: camelCase(name),
    kebabName,
    snakeName: snakeCase(name),
    constantName: constantCase(name),
    pluralName: pluralize(kebabName),
  };
}
