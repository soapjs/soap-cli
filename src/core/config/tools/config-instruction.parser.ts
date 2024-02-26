import { ParamSchema, PropSchema } from "../../components";
import { TypeInfo } from "../../type.info";
import { Config } from "../config";

export type InstructionData = { [key: string]: any; dependencies: any[] };
/*
{{IF DEPENDENCY(WHERE type.isModel IS NOT true).type IS true}}
{{USE DEPENDENCY(WHERE type.type IS input).element.name}}
{{USE DEPENDENCY(WHERE type.type IS input).element.name}}
{{USE DEPENDENCY(WHERE type.type IS input).element.name TO BUILD Array<Param>}}
{{USE ADDONS().table}}

0: "{{USE DEPENDENCY(WHERE type.type IS input).element.name TO BUILD Array<Param>}}"
1: "USE"
2: "DEPENDENCY"
3: "WHERE"
4: "type.type"
5: " IS "
6: "input"
7: "element.name"
8: " TO BUILD "
9: "Array<Param>"
*/
const instruction_regex =
  /{{\s*(USE|IF)\s+(DEPENDENCY|ADDONS)\(([A-Z]+)?\s*([a-zA-Z.0-9_]+)?(\s+[A-Z=\>\<\! ]+\s+)?([a-zA-Z0-9\"\'\_\- ]+)?\).?([a-z.A-Z0-9\[\]-_\(\)]+)?(\s+[A-Z_ ]+\s+)?([^}]+)?\s*}}/;

const flag_regex = /{{\s*FLAG\s+([a-zA-Z.0-9_,]+)\s*}}/;

export class ConfigInstructionParser {
  static hasInstructions(value: string) {
    return new RegExp(instruction_regex, "g").test(value);
  }

  static executeInstructions(
    value: string,
    data: InstructionData,
    config: Config
  ): any {
    const instruction_match = value.match(new RegExp(instruction_regex, "g"));
    const flag_match = value.match(new RegExp(flag_regex));

    if (Array.isArray(instruction_match)) {
      if (instruction_match.length === 1) {
        const parsed = this.parseInstruction(
          instruction_match[0],
          data,
          config
        );

        if (value.length === instruction_match[0].length) {
          return parsed;
        }

        return value.replace(instruction_match[0], parsed);
      }

      let result = value;
      instruction_match.forEach((match) => {
        const parsed = this.parseInstruction(match, data, config);

        result = result.replace(match, parsed);
      });

      return result;
    } else if (Array.isArray(flag_match)) {
      return flag_match[1].split(",");
    }
  }

  private static parseInstruction(
    str: string,
    data: InstructionData,
    config: Config
  ): any {
    const [
      ref,
      instruction,
      source_type,
      where,
      source_path,
      source_operator,
      source_value,
      path,
      command,
      target,
    ] = str.match(instruction_regex);
    let o;
    const source =
      source_type.toLowerCase() === "dependency"
        ? data.dependencies
        : data.addons;

    o = this.getSource(source, source_path, source_operator, source_value);

    const value = path ? this.getValueFromPath(o, path.trim()) : o;

    if (instruction === "USE" && command?.trim() === "TO BUILD") {
      return this.parseBuild(value, target, data, config);
    }

    if (instruction === "IF" && command) {
      return this.metCondition(command, value, target);
    }

    return value;
  }

  private static parseBuild(
    ref: any,
    element: string,
    data: InstructionData,
    config: Config
  ): any[] | any {
    const refs = Array.isArray(ref) ? ref : [ref];
    const array_match = element.toLowerCase().match(/array<(.+)>/);
    const result = [];
    let target;

    if (array_match) {
      target = array_match[1];
    } else {
      target = element.toLowerCase();
    }

    refs.forEach((r) => {
      if (target === "param") {
        result.push(ParamSchema.create(r, config, data));
      } else if (target === "prop") {
        result.push(PropSchema.create(r, config, data));
      } else if (target === "typeinfo" || target === "type") {
        result.push(TypeInfo.create(r, config));
      }
    });

    return array_match ? result : result[0];
  }

  private static getValueFromPath(data: InstructionData, path: string): any {
    return path.split(".").reduce((acc, part) => acc && acc[part], data);
  }

  private static metCondition(operator, value, expected) {
    const op = operator.trim().toLowerCase();
    if (
      op === "is not" &&
      typeof expected === "string" &&
      (expected.toLowerCase() === "null" ||
        expected.toLowerCase() === "undefined")
    ) {
      return !!value;
    }

    if (
      ((op === "=" || op === "==" || op === "===" || op === "is") &&
        value ==
          (expected.toLowerCase() === "true"
            ? true
            : expected.toLowerCase() === "false"
              ? false
              : expected)) ||
      ((op === "!==" || op === "!=" || op === "is not" || op === "not") &&
        value ===
          (expected.toLowerCase() === "true"
            ? true
            : expected.toLowerCase() === "false"
              ? false
              : expected)) ||
      ((op === ">" || op === "gt") && value > expected) ||
      ((op === "<" || op === "lt") && value < expected) ||
      ((op === ">=" || op === "gte") && value >= expected) ||
      ((op === "<=" || op === "lte") && value <= expected)
    ) {
      return true;
    }

    return false;
  }

  private static getSource(
    source: any,
    path: string,
    operator: string,
    value: string
  ): any {
    if (path && operator && value) {
      if (Array.isArray(source)) {
        for (const d of source) {
          if (typeof d === "object") {
            const v = this.getValueFromPath(d, path);

            if (this.metCondition(operator, v, value)) {
              return d;
            }
          } else {
            return d;
          }
        }
      } else if (typeof source === "object") {
        return this.getValueFromPath(source, path);
      }
    } else {
      return source;
    }
  }
}
