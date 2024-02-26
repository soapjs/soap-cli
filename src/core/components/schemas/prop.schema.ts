import { camelCase } from "change-case";
import { Config, ConfigInstructionParser } from "../../config";
import { TypeInfo, UnknownType } from "../../type.info";
import { SchemaTools } from "../schema.tools";
import { PropJson, PropSchemaObject } from "@soapjs/soap-cli-common";

export const PROP_REGEX =
  /^(inject)?\s*(private|protected|public)?\s*(static|readonly)?\s*([a-zA-Z0-9_]+)(\?)?(\s*:\s*([a-zA-Z0-9\[\]\<\>\{\}\|\& ]+))?(\s*=\s*(.+))?$/;

export type PropData = {
  name?: string;
  type?: TypeInfo;
  access?: string;
  is_optional?: boolean;
  is_readonly?: boolean;
  is_static?: boolean;
  value?: unknown;
  template?: string;
};

export class PropTools {
  static stringToData(
    str: string,
    config: Config,
    references?: { [key: string]: unknown; dependencies: any[] }
  ): PropData {
    let name: string;
    let type: TypeInfo;
    let value: unknown;
    let isReadonly: boolean;
    let isStatic: boolean;
    let isOptional: boolean;
    let access: string;

    const match = str.match(PROP_REGEX);

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

      isReadonly = match[3] === "readonly";
      isStatic = match[3] === "static";
      isOptional = !!match[5];
      access = match[2]?.trim();
    } else {
      throw new Error(`Prop regex match failure`);
    }

    return {
      name,
      type,
      value,
      is_readonly: isReadonly,
      is_static: isStatic,
      is_optional: isOptional,
      access,
    };
  }
  static arrayToData(
    data: (string | PropJson)[],
    config: Config,
    references?: { [key: string]: unknown; dependencies: any[] }
  ) {
    if (Array.isArray(data)) {
      return data.map((item) => {
        if (typeof item === "string") {
          return PropTools.stringToData(item, config, references);
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
          is_static: item.is_static,
          value,
        };
      });
    }
    return [];
  }
}

export class PropSchema {
  public static create(
    data: string | PropJson | PropData,
    config: Config,
    references: { [key: string]: unknown; dependencies: any[] },
    meta?: any
  ): PropSchema {
    if (!data) {
      return null;
    }

    let name: string;
    let type: TypeInfo;
    let value: unknown;
    let isReadonly: boolean;
    let isStatic: boolean;
    let isOptional: boolean;
    let access: string;
    let template: string;

    if (typeof data === "string") {
      const prop = PropTools.stringToData(data, config, references);
      name = prop.name;
      isOptional = prop.is_optional;
      isReadonly = prop.is_readonly;
      isStatic = prop.is_static;
      type = prop.type;
      value = prop.value;
      access = prop.access;
    } else {
      isOptional = data.is_optional;
      isReadonly = data.is_readonly;
      isStatic = data.is_static;
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

      template = (<PropData>data).template;
    }

    return new PropSchema(
      camelCase(name),
      type,
      access,
      isOptional,
      isReadonly,
      isStatic,
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
    public readonly isStatic: boolean,
    public readonly value: any,
    public readonly template: string,
    public readonly meta?: any
  ) {}

  toObject(): PropSchemaObject {
    const {
      name,
      type,
      access,
      isOptional: is_optional,
      isReadonly: is_readonly,
      isStatic: is_static,
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
      is_static,
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
