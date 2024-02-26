import { AccessType } from "@soapjs/soap-cli-common";
import { Config, ConfigInstructionParser, InstructionData } from "../config";

export class SchemaTools {
  static splitIgnoringBrackets(str, delimiter) {
    if (!str) {
      return [];
    }

    const result = [];
    let bracketStack = [];
    let currentSegment = "";
    let inString = false;
    let escapeNext = false;

    for (let char of str) {
      if (escapeNext) {
        currentSegment += char;
        escapeNext = false;
        continue;
      }

      if (char === "\\") {
        escapeNext = true;
        continue;
      }

      if (char === '"' || char === "'") {
        inString = !inString;
      }

      if (!inString) {
        if (["<", "[", "("].includes(char)) {
          bracketStack.push(char);
        } else if (
          (char === ">" && bracketStack[bracketStack.length - 1] === "<") ||
          (char === "]" && bracketStack[bracketStack.length - 1] === "[") ||
          (char === ")" && bracketStack[bracketStack.length - 1] === "(")
        ) {
          bracketStack.pop();
        }
      }

      if (char === delimiter && bracketStack.length === 0 && !inString) {
        result.push(currentSegment.trim());
        currentSegment = "";
      } else {
        currentSegment += char;
      }
    }

    if (currentSegment) {
      result.push(currentSegment.trim());
    }

    return result;
  }

  static getAccessType(...values: string[]) {
    for (const value of values) {
      if (
        value === AccessType.Private ||
        value === AccessType.Protected ||
        value === AccessType.Public
      ) {
        return value;
      }
    }

    return "";
  }

  static isStatic(...values: string[]) {
    for (const value of values) {
      if (value === "static") {
        return true;
      }
    }

    return false;
  }

  static isReadonly(...values: string[]) {
    for (const value of values) {
      if (value === "readonly") {
        return true;
      }
    }

    return false;
  }

  static isAsync(...values: string[]) {
    for (const value of values) {
      if (value === "readonly") {
        return true;
      }
    }

    return false;
  }

  static removeNullUndefined<T = any>(obj: T, deep = false): T {
    Object.keys(obj).forEach((key) => {
      if (obj[key] === null || obj[key] === undefined) {
        delete obj[key];
      }
    });
    return obj;
  }

  static parseValue(data: any, parser) {
    if (Array.isArray(data)) {
      return data.map((value) => parser(value));
    }

    if (typeof data === "object") {
      const parsed = {};

      Object.keys(data).forEach((key) => {
        const value = data[key];

        if (Array.isArray(value)) {
          parsed[key] = value.map((v) => parser(v));
        } else {
          parsed[key] = parser(value);
        }
      });
      return parsed;
    }

    return data;
  }

  static executeMeta(item: any, data: InstructionData, config: Config) {
    if (item["meta"]) {
      return ConfigInstructionParser.executeInstructions(
        item["meta"],
        data,
        config
      );
    }

    return true;
  }
}
