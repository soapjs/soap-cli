import {
  AccessType,
  MethodJson,
  MethodSchemaObject,
} from "@soapjs/soap-cli-common";
import { Config, ConfigInstructionParser } from "../../config";
import { TypeInfo, UnknownType } from "../../type.info";
import { SchemaTools } from "../schema.tools";
import { GenericData, GenericTools, GenericSchema } from "./generic.schema";
import { ParamData, ParamTools, ParamSchema } from "./param.schema";

export const METHOD_REGEX =
  /^(static|async|private|protected|public)?\s*(static|async|private|protected|public)?\s*(async|static|private|protected|public)?\s*([a-zA-Z0-9_]+)(\s*\<(.+)\>\s*)?(\((.*)\))?(\s*:\s*([a-zA-Z0-9\[\]\<\>\{\\}]+))?(\s*=>\s*(.*))?$/;

export type MethodData = {
  access?: string;
  name?: string;
  return_type?: TypeInfo;
  is_async?: boolean;
  is_static?: boolean;
  params?: ParamData[];
  body?: string;
  template?: string;
  supr?: MethodData;
  generics?: GenericData[];
};

export class MethodTools {
  static stringToData(
    str: string,
    config: Config,
    references?: { [key: string]: unknown; dependencies: any[] }
  ): MethodData {
    let name: string;
    let access: string;
    let params: ParamData[] = [];
    let returnType: TypeInfo;
    let isAsync: boolean;
    let isStatic: boolean;
    let body: string;
    let supr: MethodData;
    let generics: GenericData[] = [];

    const match = str.match(METHOD_REGEX);

    if (Array.isArray(match)) {
      access =
        SchemaTools.getAccessType(
          match[1]?.trim(),
          match[2]?.trim(),
          match[3]?.trim()
        ) || AccessType.Public;
      isStatic = SchemaTools.isStatic(
        match[1]?.trim(),
        match[2]?.trim(),
        match[3]?.trim()
      );
      isAsync = SchemaTools.isAsync(
        match[1]?.trim(),
        match[2]?.trim(),
        match[3]?.trim()
      );

      if (match[4]) {
        let temp = match[4].trim();
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

      if (match[10]) {
        let temp = match[10].trim();
        if (ConfigInstructionParser.hasInstructions(temp)) {
          temp = ConfigInstructionParser.executeInstructions(
            temp,
            references,
            config
          );
        }
        returnType = TypeInfo.isType(temp)
          ? temp
          : TypeInfo.create(temp, config);
      } else {
        returnType = UnknownType.create();
      }

      body = match[12]?.trim();

      SchemaTools.splitIgnoringBrackets(match[6], ",").forEach((str) => {
        generics.push(GenericTools.stringToData(str, config, references));
      });
      SchemaTools.splitIgnoringBrackets(match[8], ",").forEach((str) => {
        params.push(ParamTools.stringToData(str, config, references));
      });
    } else {
      throw new Error(`Method regex match failure`);
    }

    return {
      name,
      access,
      params,
      return_type: returnType,
      is_async: isAsync,
      is_static: isStatic,
      body,
      supr,
      generics,
    };
  }

  static arrayToData(
    data: (string | MethodJson)[],
    config: Config,
    references?: { [key: string]: unknown; dependencies: any[] }
  ) {
    if (Array.isArray(data)) {
      return data.map((item) => {
        if (typeof item === "string") {
          return MethodTools.stringToData(item, config, references);
        }
        let name = item.name;
        let return_type;

        if (typeof item.return_type === "string") {
          let temp = item.return_type.trim();
          if (ConfigInstructionParser.hasInstructions(temp)) {
            temp = ConfigInstructionParser.executeInstructions(
              temp,
              references,
              config
            );
          }
          return_type = TypeInfo.isType(temp)
            ? temp
            : TypeInfo.create(temp, config);
        }

        const tempName = item.name.trim();
        if (ConfigInstructionParser.hasInstructions(tempName)) {
          name = ConfigInstructionParser.executeInstructions(
            tempName,
            references,
            config
          );
        } else {
          name = tempName;
        }

        return {
          name,
          params: Array.isArray(item.params)
            ? ParamTools.arrayToData(item.params, config, references)
            : [],
          access: item.access,
          is_async: item.is_async,
          is_static: item.is_static,
          return_type,
        };
      });
    }
    return [];
  }
}

export class MethodSchema {
  public static create(
    data: MethodData | MethodJson | string,
    config: Config,
    references?: { [key: string]: unknown; dependencies: any[] },
    meta?: any
  ): MethodSchema {
    if (!data) {
      return null;
    }

    let name: string;
    let access: string;
    let params: ParamSchema[] = [];
    let returnType: TypeInfo;
    let isAsync: boolean;
    let isStatic: boolean;
    let body: string;
    let template: string;
    let supr: MethodSchema;
    let generics: GenericSchema[] = [];

    if (typeof data === "string") {
      const mth = MethodTools.stringToData(data, config, references);
      name = mth.name;
      access = mth.access;
      params = mth.params.map((p) => ParamSchema.create(p, config, references));
      returnType = mth.return_type;
      isAsync = mth.is_async;
      isStatic = mth.is_static;
      body = mth.body;
      generics = mth.generics.map((g) =>
        GenericSchema.create(g, config, references)
      );
    } else {
      access = data.access || AccessType.Public;
      isAsync = data.is_async;
      isStatic = data.is_static;
      body = data.body;

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

      if (TypeInfo.isType(data.return_type)) {
        returnType = data.return_type;
      } else if (typeof data.return_type === "string") {
        let temp = data.return_type.trim();
        if (ConfigInstructionParser.hasInstructions(temp)) {
          temp = ConfigInstructionParser.executeInstructions(
            temp,
            references,
            config
          );
        }
        returnType = TypeInfo.isType(temp)
          ? temp
          : TypeInfo.create(temp, config);
      }

      if (Array.isArray(data.params)) {
        data.params.forEach((param) => {
          if (typeof param === "string") {
            if (ConfigInstructionParser.hasInstructions(param)) {
              const p = ConfigInstructionParser.executeInstructions(
                param,
                references,
                config
              );
              if (p) {
                params.push(p);
              }
            } else {
              params.push(ParamSchema.create(param, config, references));
            }
          } else {
            const meta = SchemaTools.executeMeta(param, references, config);
            if (meta) {
              params.push(ParamSchema.create(param, config, references, meta));
            }
          }
        });
      } else if (typeof data.params === "string") {
        if (ConfigInstructionParser.hasInstructions(data.params)) {
          params = ConfigInstructionParser.executeInstructions(
            data.params,
            references,
            config
          );
        } else {
          const meta = SchemaTools.executeMeta(data.params, references, config);
          if (meta) {
            params.push(
              ParamSchema.create(data.params, config, references, meta)
            );
          }
        }
      }

      if (Array.isArray(data.generics)) {
        data.generics.forEach((g) => {
          const meta = SchemaTools.executeMeta(g, references, config);
          if (meta) {
            generics.push(GenericSchema.create(g, config, references, meta));
          }
        });
      }

      if (data.supr) {
        const meta = SchemaTools.executeMeta(data.supr, references, config);
        if (meta) {
          supr = MethodSchema.create(data.supr, config, references, meta);
        }
      }

      template = (<MethodData>data).template;
    }

    const method = new MethodSchema(
      name,
      access,
      returnType,
      isStatic,
      isAsync,
      body,
      supr,
      template,
      meta
    );

    params.forEach((param) => {
      method.addParam(param);
    });

    generics.forEach((generic) => {
      method.addGeneric(generic);
    });

    return method;
  }

  private __params: ParamSchema[] = [];
  private __generics: GenericSchema[] = [];

  private constructor(
    public readonly name: string,
    public readonly access: string,
    public readonly returnType: TypeInfo,
    public readonly isStatic: boolean,
    public readonly isAsync: boolean,
    public readonly body: string,
    public readonly supr: MethodSchema,
    public readonly template: string,
    public readonly meta?: any
  ) {}

  addParam(param: ParamSchema) {
    if (this.hasParam(param.name) === false) {
      this.__params.push(param);
    }
  }

  findParam(name: string) {
    return this.__params.find((p) => p.name === name);
  }

  hasParam(name: string) {
    return this.__params.findIndex((p) => p.name === name) !== -1;
  }

  get params() {
    return [...this.__params];
  }

  addGeneric(generic: GenericSchema) {
    if (this.hasGeneric(generic.name) === false) {
      this.__generics.push(generic);
    }
  }

  findGeneric(name: string) {
    return this.__generics.find((p) => p.name === name);
  }

  hasGeneric(name: string) {
    return this.__generics.findIndex((p) => p.name === name) !== -1;
  }

  get generics() {
    return [...this.__generics];
  }

  toObject(): MethodSchemaObject {
    const {
      access,
      __params,
      __generics,
      body,
      supr,
      isAsync,
      isStatic,
      name,
      returnType,
      template,
      meta,
    } = this;

    const mth: MethodSchemaObject = {
      access,
      params: __params.map((p) => p.toObject()),
      generics: __generics.map((g) => g.toObject()),
      body,
      supr: supr?.toObject(),
      is_async: isAsync,
      is_static: isStatic,
      name,
      return_type: returnType,
      template,
      meta,
    };

    return mth;
  }

  listTypes() {
    const { returnType, __generics, __params, supr } = this;
    const list = [];

    if (returnType) {
      list.push(returnType);
    }

    __generics.forEach((g) => {
      list.push(...g.listTypes());
    });

    __params.forEach((p) => {
      list.push(...p.listTypes());
    });

    if (supr) {
      list.push(...supr.listTypes());
    }

    return list;
  }
}
