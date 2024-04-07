import { DefaultCliOptions } from "../config/cli.types";
import { SchemaTools } from "@soapjs/soap-cli-common";

export class CliOptionsParser {
  static parse<T = DefaultCliOptions>(input: { [key: string]: unknown }): T {
    const options = {};

    if (input) {
      Object.keys(input).forEach((key) => {
        const value = input[key];
        if (typeof value === "string") {
          if (value.startsWith("=")) {
            options[key] = value.substring(1);
          } else {
            options[key] = value;
          }
        } else if (Array.isArray(value)) {
          const parts = new Set<string>();
          value.forEach((str) => {
            const list = SchemaTools.splitIgnoringBrackets(str, ",");
            list.forEach((item: string) => {
              if (item) {
                const v = item.trim();
                if (v.startsWith("=")) {
                  parts.add(v.substring(1));
                } else {
                  parts.add(v);
                }
              }
            });
          });
          options[key] = [...parts];
        } else {
          options[key] = value;
        }
      });
    }
    return options as T;
  }
}
