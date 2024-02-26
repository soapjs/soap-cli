import { camelCase } from "change-case";
import { Config, ConfigInstructionParser } from "../../config";
import { TypeInfo, UnknownType } from "../../type.info";
import { SchemaTools } from "../schema.tools";
import { ParamJson, ParamSchemaObject } from "@soapjs/soap-cli-common";

export const PARAM_REGEX =
  /^(inject)?\s*(private|protected|public)?\s*(readonly)?\s*([a-zA-Z0-9_]+)(\?)?(\s*:\s*([a-zA-Z0-9\[\]\<\>\{\}\|\& ]+))?(\s*=\s*(.+))?$/;

export type ParamData = {
  name?: string;
  type?: TypeInfo;
  access?: string;
  is_optional?: boolean;
  is_readonly?: boolean;
  value?: unknown;
  template?: string;
};

export class ParamTools {
  static stringToData(
    str: string,
    config: Config,
    references?: { [key: string]: unknown; dependencies: any[] }
  ): ParamData {
    let name: string;
    let type: TypeInfo;
    let value: unknown;
    let isReadonly: boolean;
    let isOptional: boolean;
    let access: string;

    const match = str.match(PARAM_REGEX);

    if (Array.isArray(match)) {
      if (match[4]) {
        const temp = match[4].trim();
        if (ConfigInstructionParser.hasInstructions(temp)) {
          name = ConfigInstructionParser.executeInstructions(
            temp,
            references,
            config
          );
        } else {
          name = temp;
        }
      }

      if (match[7]) {
        let temp = match[7].trim();
        if (ConfigInstructionParser.hasInstructions(temp)) {
          temp = ConfigInstructionParser.executeInstructions(
            temp,
            references,
            config
          );
        }
        if (TypeInfo.isType(temp)) {
          type = temp;
        } else {
          type = TypeInfo.create(temp, config);
        }
      } else {
        type = UnknownType.create();
      }

      if (match[9]) {
        const temp = match[9].trim();
        if (ConfigInstructionParser.hasInstructions(temp)) {
          value = ConfigInstructionParser.executeInstructions(
            temp,
            references,
            config
          );
        } else {
          value = temp;
        }
      }

      isReadonly = !!match[3];
      isOptional = !!match[5];
      access = match[2]?.trim();
    } else {
      throw new Error(`Param regex match failure`);
    }

    return {
      name,
      type,
      value,
      is_readonly: isReadonly,
      is_optional: isOptional,
      access,
    };
  }

  static arrayToData(
    data: (string | ParamJson)[],
    config: Config,
    references?: { [key: string]: unknown; dependencies: any[] }
  ) {
    if (Array.isArray(data)) {
      return data.map((item) => {
        if (typeof item === "string") {
          return ParamTools.stringToData(item, config, references);
        }
        let value;
        let type;
        let name;

        if (typeof item.value === "string") {
          const temp = item.value.trim();
          if (ConfigInstructionParser.hasInstructions(temp)) {
            value = ConfigInstructionParser.executeInstructions(
              temp,
              references,
              config
            );
          } else {
            value = temp;
          }
        } else {
          value = SchemaTools.parseValue(item.value, (value) => {
            return ConfigInstructionParser.hasInstructions(value)
              ? ConfigInstructionParser.executeInstructions(
                  value,
                  references,
                  config
                )
              : value;
          });
        }

        if (typeof item.type === "string") {
          let temp = item.type.trim();
          if (ConfigInstructionParser.hasInstructions(temp)) {
            temp = ConfigInstructionParser.executeInstructions(
              temp,
              references,
              config
            );
          }
          if (TypeInfo.isType(temp)) {
            type = temp;
          } else {
            type = TypeInfo.create(temp, config);
          }
        }

        if (typeof item.name === "string") {
          const temp = item.name.trim();
          if (ConfigInstructionParser.hasInstructions(temp)) {
            name = ConfigInstructionParser.executeInstructions(
              temp,
              references,
              config
            );
          } else {
            name = temp;
          }
        } else {
          name = item.name;
        }

        return {
          name,
          type,
          access: item.access,
          is_optional: item.is_optional,
          is_readonly: item.is_readonly,
          value,
        };
      });
    }
    return [];
  }
}

export class ParamSchema {
  public static create(
    data: string | ParamJson | ParamData,
    config: Config,
    references?: { [key: string]: unknown; dependencies: any[] },
    meta?: any
  ): ParamSchema {
    if (!data) {
      return null;
    }

    let name: string;
    let type: TypeInfo;
    let value: unknown;
    let isReadonly: boolean;
    let isOptional: boolean;
    let access: string;
    let template: string;

    if (typeof data === "string") {
      const param = ParamTools.stringToData(data, config, references);
      name = param.name;
      type = param.type;
      value = param.value;
      isReadonly = param.is_readonly;
      isOptional = param.is_optional;
      access = param.access;
    } else {
      name = data.name;
      isOptional = data.is_optional;
      isReadonly = data.is_readonly;
      access = data.access;

      if (typeof data.type === "string") {
        let temp = data.type.trim();
        if (ConfigInstructionParser.hasInstructions(temp)) {
          temp = ConfigInstructionParser.executeInstructions(
            temp,
            references,
            config
          );
        }

        if (TypeInfo.isType(temp)) {
          type = temp;
        } else {
          type = TypeInfo.create(temp, config);
        }
      } else if (TypeInfo.isType(data.type)) {
        type = data.type;
      } else {
        type = UnknownType.create();
      }

      if (typeof data.value === "string") {
        const temp = data.value.trim();
        if (ConfigInstructionParser.hasInstructions(temp)) {
          value = ConfigInstructionParser.executeInstructions(
            temp,
            references,
            config
          );
        } else {
          value = temp;
        }
      } else {
        value = SchemaTools.parseValue(data.value, (value) => {
          return ConfigInstructionParser.hasInstructions(value)
            ? ConfigInstructionParser.executeInstructions(
                value,
                references,
                config
              )
            : value;
        });
      }

      const tempName = data.name.trim();
      if (ConfigInstructionParser.hasInstructions(tempName)) {
        name = ConfigInstructionParser.executeInstructions(
          tempName,
          references,
          config
        );
      } else {
        name = tempName;
      }

      template = (<ParamData>data).template;
    }

    return new ParamSchema(
      camelCase(name),
      type,
      access,
      isOptional,
      isReadonly,
      value,
      template,
      meta
    );
  }

  private constructor(
    public readonly name: string,
    public readonly type: TypeInfo,
    public readonly access: string,
    public readonly isOptional: boolean,
    public readonly isReadonly: boolean,
    public readonly value: any,
    public readonly template: string,
    public readonly meta?: any
  ) {}

  toObject(): ParamSchemaObject {
    const {
      name,
      type,
      access,
      isOptional: is_optional,
      isReadonly: is_readonly,
      value,
      template,
      meta,
    } = this;

    return {
      name,
      type,
      access,
      is_optional,
      is_readonly,
      value,
      template,
      meta,
    };
  }

  listTypes() {
    const { type } = this;
    return [type];
  }
}
