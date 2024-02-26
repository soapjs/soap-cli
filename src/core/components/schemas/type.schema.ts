import {
  ConfigJsonAddons,
  ExportJson,
  ExportSchemaObject,
  GenericJson,
  GenericSchemaObject,
  ImportJson,
  ImportSchemaObject,
  PropJson,
  PropSchemaObject,
} from "@soapjs/soap-cli-common";
import { Config, ConfigInstructionParser } from "../../config";
import { TypeInfo, ObjectType, UnknownType } from "../../type.info";
import { SchemaTools } from "../schema.tools";
import { ExportData, ExportSchema } from "./export.schema";
import { GenericData, GenericTools, GenericSchema } from "./generic.schema";
import { ImportData, ImportSchema } from "./import.schema";
import { PropData, PropSchema } from "./prop.schema";

export const TYPE_REGEX =
  /([a-zA-Z0-9_]+)\s*(<([a-zA-Z0-9_, \<\>\[\]\(\)]+)>)?(\s*=\s*(.+))?/;

export type TypeData = {
  id?: string;
  exp?: ExportData;
  name?: string;
  props?: (PropData | string)[];
  type?: TypeInfo;
  generics?: GenericData[];
  imports?: ImportData[];
  alias?: any;
};

export type TypeObject = ConfigJsonAddons & {
  exp?: ExportSchemaObject;
  name: string;
  props?: PropSchemaObject[];
  generics?: GenericSchemaObject[];
  alias?: any;
  imports?: ImportSchemaObject[];
};

export type TypeJson = {
  id?: string;
  exp?: string | boolean | ExportJson;
  name?: string;
  props?: PropJson[];
  type: string;
  generics?: GenericJson[];
  imports?: ImportJson[];
  alias?: any;
};

export type TypeConfig = TypeJson & ConfigJsonAddons;

export class TypeTools {
  static stringToData(
    str: string,
    config: Config,
    references?: { [key: string]: unknown; dependencies: any[] }
  ): TypeData {
    let type: TypeInfo;
    let name: string;
    let props: PropData[] = [];
    let generics: GenericData[] = [];

    const match = str.match(TYPE_REGEX);

    name = match[1].trim();

    SchemaTools.splitIgnoringBrackets(match[3], ",").forEach((str) => {
      generics.push(GenericTools.stringToData(str, config, references));
    });

    if (match[5]) {
      try {
        const obj = JSON.parse(match[5]);
        Object.keys(obj).forEach((key) => {
          props.push({ name: key, type: obj[key] });
        });
        type = ObjectType.create();
      } catch (e) {
        let temp = match[5].trim();
        if (ConfigInstructionParser.hasInstructions(temp)) {
          temp = ConfigInstructionParser.executeInstructions(
            temp,
            references,
            config
          );
        }
        type = TypeInfo.create(temp, config);
      }
    }

    return {
      type,
      name,
      props,
      generics,
    };
  }
}

export class TypeSchema {
  public static create<T>(
    data: string | TypeData | TypeJson,
    config: Config,
    references?: { [key: string]: unknown; dependencies: any[] }
  ) {
    if (!data) {
      return null;
    }

    let exp: ExportSchema;
    let type: TypeInfo;
    let alias: TypeInfo;
    let name: string;
    let props: PropSchema[] = [];
    let generics: GenericSchema[] = [];
    let imports = [];

    if (typeof data === "string") {
      const tp = TypeTools.stringToData(data, config, references);
      type = tp.type;
      name = tp.name;
      props = tp.props.map((p) => PropSchema.create(p, config, references));
      generics = tp.generics.map((g) =>
        GenericSchema.create(g, config, references)
      );
    } else {
      name = data.name;

      if (typeof data.type === "string") {
        let temp = data.type.trim();

        if (ConfigInstructionParser.hasInstructions(temp)) {
          temp = ConfigInstructionParser.executeInstructions(
            temp,
            references,
            config
          );
        }
        type = TypeInfo.create(temp, config);
      } else if (TypeInfo.isType(data.type)) {
        type = data.type;
      } else {
        type = UnknownType.create();
      }

      if (data.exp) {
        exp = ExportSchema.create(data.exp);
      }

      if (Array.isArray(data.props)) {
        data.props.forEach((p) => {
          props.push(PropSchema.create(p, config, references));
        });
      }

      if (typeof data.alias === "string") {
        let temp = data.alias.trim();

        if (ConfigInstructionParser.hasInstructions(temp)) {
          alias = ConfigInstructionParser.executeInstructions(
            temp,
            references,
            config
          );
        } else {
          alias = TypeInfo.create(temp, config);
        }
      } else if (TypeInfo.isType(data.alias)) {
        alias = data.alias;
      }

      if (Array.isArray(data.imports)) {
        imports = [...data.imports];
      }
    }

    const t = new TypeSchema(name, alias, exp);

    generics.forEach((g) => t.addGeneric(g));
    props.forEach((p) => t.addProp(p));

    imports.forEach((i) => {
      const meta = SchemaTools.executeMeta(i, references, config);
      if (meta) {
        t.addImport(ImportSchema.create(i, config, references, meta));
      }
    });

    return t as T;
  }

  private __imports: ImportSchema[] = [];
  private __props: PropSchema[] = [];
  private __generics: GenericSchema[] = [];

  private constructor(
    public readonly name: string,
    public readonly alias: TypeInfo,
    public readonly exp: ExportSchema,
    public readonly meta?: any
  ) {}

  addImport(impt: ImportSchema) {
    if (this.hasImport(impt) === false) {
      this.__imports.push(impt);
    }
  }

  findImport(impt: ImportData) {
    const { dflt, path, alias, list } = impt;

    return this.__imports.find(
      (p) =>
        p.path === path &&
        p.alias === alias &&
        p.dflt === dflt &&
        impt.list.every((i) => list.includes(i))
    );
  }

  hasImport(impt: ImportData) {
    const { dflt, path, alias, list } = impt;

    return (
      this.__imports.findIndex(
        (p) =>
          p.path === path &&
          p.alias === alias &&
          p.dflt === dflt &&
          impt.list.every((i) => list.includes(i))
      ) > -1
    );
  }

  get imports() {
    return [...this.__imports];
  }

  addProp(prop: PropSchema) {
    if (this.hasProp(prop.name) === false) {
      this.__props.push(prop);
    }
  }

  findProp(name: string) {
    return this.__props.find((p) => p.name === name);
  }

  hasProp(name: string) {
    return this.__props.findIndex((p) => p.name === name) !== -1;
  }

  get props() {
    return [...this.__props];
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

  toObject(): TypeObject {
    const { __props, __generics, name, exp, alias, __imports, meta } = this;

    return {
      name,
      exp: exp?.toObject(),
      alias,
      props: __props.map((p) => p.toObject()),
      generics: __generics.map((g) => g.toObject()),
      imports: __imports.map((i) => i.toObject()),
      meta,
    };
  }

  listTypes() {
    const { __props, __generics, alias } = this;
    const types = [];

    if (alias) {
      types.push(alias);
    }

    __props.forEach((prop) => {
      types.push(prop.type);
    });

    __generics.forEach((generic) => {
      if (generic.dflt) {
        types.push(generic.dflt);
      }

      if (generic.inheritance) {
        types.push(generic.inheritance);
      }
    });

    return types.reduce((list: TypeInfo[], current: TypeInfo) => {
      const keys = Object.keys(current);
      if (
        list.findIndex((i) => {
          for (const key of keys) {
            if (i[key] !== current[key]) {
              return false;
            }
          }
          return true;
        }) === -1
      ) {
        list.push(current);
      }
      return list;
    }, []);
  }
}
