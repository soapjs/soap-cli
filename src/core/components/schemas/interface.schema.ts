import { nanoid } from "nanoid";
import { Config, ConfigInstructionParser } from "../../config";
import { SchemaTools } from "../schema.tools";
import { ExportData, ExportSchema } from "./export.schema";
import { GenericData, GenericSchema } from "./generic.schema";
import { MethodData, MethodSchema } from "./method.schema";
import { PropData, PropSchema } from "./prop.schema";
import { ImportData, ImportSchema } from "./import.schema";
import { InheritanceData, InheritanceSchema } from "./inheritance.schema";
import { InterfaceJson, InterfaceSchemaObject } from "@soapjs/soap-cli-common";

export type InterfaceData = {
  exp?: ExportData;
  inheritance?: InheritanceData[];
  props: PropData[];
  methods: MethodData[];
  generics?: GenericData[];
  imports?: ImportData[];
  name: string;
  id?: string;
};

export class InterfaceSchema {
  public static create(
    data: InterfaceData | InterfaceJson,
    config: Config,
    references?: { [key: string]: unknown; dependencies: any[] },
    meta?: any
  ) {
    if (!data) {
      return null;
    }

    let exp: ExportSchema;
    let inheritance: InheritanceSchema[] = [];

    if (data.exp) {
      exp = ExportSchema.create(data.exp);
    }

    if (Array.isArray(data.inheritance)) {
      data.inheritance.forEach((i) => {
        if (typeof i === "string") {
          inheritance.push(
            InheritanceSchema.create({ name: i }, config, references)
          );
        } else {
          const meta = SchemaTools.executeMeta(i, references, config);
          if (meta) {
            inheritance.push(
              InheritanceSchema.create(i, config, references, meta)
            );
          }
        }
      });
    }

    let name;
    if (ConfigInstructionParser.hasInstructions(data.name)) {
      name = ConfigInstructionParser.executeInstructions(
        data.name,
        references,
        config
      );
    } else {
      name = data.name;
    }

    const intf = new InterfaceSchema(
      data.id || nanoid(),
      name,
      exp,
      inheritance,
      meta
    );

    if (Array.isArray(data.props)) {
      data.props.forEach((p) => {
        const meta = SchemaTools.executeMeta(p, references, config);
        if (meta) {
          intf.addProp(PropSchema.create(p, config, references, meta));
        }
      });
    }

    if (Array.isArray(data.methods)) {
      data.methods.forEach((m) => {
        const meta = SchemaTools.executeMeta(m, references, config);
        if (meta) {
          intf.addMethod(MethodSchema.create(m, config, references, meta));
        }
      });
    }

    if (Array.isArray(data.generics)) {
      data.generics.forEach((g) => {
        const meta = SchemaTools.executeMeta(g, references, config);
        if (meta) {
          intf.addGeneric(GenericSchema.create(g, config, references, meta));
        }
      });
    }

    if (Array.isArray(data.imports)) {
      data.imports.forEach((i) => {
        const meta = SchemaTools.executeMeta(i, references, config);
        if (meta) {
          intf.addImport(ImportSchema.create(i, config, references, meta));
        }
      });
    }

    return intf;
  }

  private __imports: ImportSchema[] = [];
  private __props: PropSchema[] = [];
  private __methods: MethodSchema[] = [];
  private __generics: GenericSchema[] = [];
  private __inheritance: InheritanceSchema[] = [];

  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly exp: ExportSchema,
    inheritance: InheritanceSchema[] = [],
    public readonly meta?: any
  ) {
    inheritance.forEach((i) => {
      this.__inheritance.push(i);
    });
  }

  get inheritance() {
    return [...this.__inheritance];
  }

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

  addMethod(method: MethodSchema) {
    if (this.hasMethod(method.name) === false) {
      this.__methods.push(method);
    }
  }

  findMethod(name: string) {
    return this.__methods.find((p) => p.name === name);
  }

  hasMethod(name: string) {
    return this.__methods.findIndex((p) => p.name === name) !== -1;
  }

  get methods() {
    return [...this.__methods];
  }

  toObject(): InterfaceSchemaObject {
    const {
      id,
      name,
      __methods,
      __props,
      __generics,
      __imports,
      __inheritance,
      exp,
      meta,
    } = this;
    const intf: InterfaceSchemaObject = {
      name,
      inheritance: __inheritance?.map((i) => i.toObject()),
      exp: exp?.toObject(),
      methods: __methods.map((i) => i.toObject()),
      props: __props.map((p) => p.toObject()),
      generics: __generics.map((g) => g.toObject()),
      imports: __imports.map((i) => i.toObject()),
      meta,
    };

    return intf;
  }

  listTypes() {
    const { inheritance, __methods, __generics, __props } = this;
    const list = [];

    __generics.forEach((g) => {
      list.push(...g.listTypes());
    });

    __props.forEach((p) => {
      list.push(...p.listTypes());
    });

    __methods.forEach((m) => {
      list.push(...m.listTypes());
    });

    if (inheritance) {
      list.push(inheritance);
    }

    return list;
  }
}
