import { ExportData, ExportSchema } from "./export.schema";
import { GenericData, GenericSchema } from "./generic.schema";
import { MethodData, MethodSchema } from "./method.schema";
import { PropData, PropSchema } from "./prop.schema";
import { ConstructorData, ConstructorSchema } from "./constructor.schema";
import { InterfaceData, InterfaceSchema } from "./interface.schema";
import { InheritanceData, InheritanceSchema } from "./inheritance.schema";
import { ImportData, ImportSchema } from "./import.schema";
import { Config } from "../../config";
import { SchemaTools } from "../schema.tools";
import { TypeInfo } from "../../type.info";
import { ClassJson, ClassSchemaObject } from "@soapjs/soap-cli-common";

export type ClassData = {
  is_abstract?: boolean;
  exp?: ExportData;
  ctor?: ConstructorData;
  interfaces?: InterfaceData[];
  inheritance?: InheritanceData[];
  props?: PropData[];
  methods?: MethodData[];
  generics?: GenericData[];
  imports?: ImportData[];
  name: string;
  id?: string;
  template?: string;
};

export class ClassSchema {
  public static create<T>(
    data: ClassData | ClassJson,
    config: Config,
    references?: { [key: string]: unknown; dependencies: any[] }
  ): T {
    if (!data) {
      return null;
    }

    let exp: ExportSchema;
    let ctor: ConstructorSchema;
    let inheritance: InheritanceSchema[] = [];

    if (data.exp) {
      exp = ExportSchema.create(data.exp);
    }

    if (data.ctor) {
      const meta = SchemaTools.executeMeta(data.ctor, references, config);
      if (meta) {
        ctor = ConstructorSchema.create(data.ctor, config, references);
      }
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

    const cls = new ClassSchema(
      data.is_abstract || false,
      data.name,
      exp,
      ctor,
      inheritance,
      (<ClassData>data).template
    );

    if (Array.isArray(data.interfaces)) {
      data.interfaces.forEach((i) => {
        const meta = SchemaTools.executeMeta(i, references, config);
        if (meta) {
          cls.addInterface(InterfaceSchema.create(i, config, references, meta));
        }
      });
    }

    if (Array.isArray(data.props)) {
      data.props.forEach((p) => {
        const meta = SchemaTools.executeMeta(p, references, config);
        if (meta) {
          cls.addProp(PropSchema.create(p, config, references, meta));
        }
      });
    }

    if (Array.isArray(data.methods)) {
      data.methods.forEach((m) => {
        const meta = SchemaTools.executeMeta(m, references, config);
        if (meta) {
          cls.addMethod(MethodSchema.create(m, config, references, meta));
        }
      });
    }

    if (Array.isArray(data.generics)) {
      data.generics.forEach((g) => {
        const meta = SchemaTools.executeMeta(g, references, config);
        if (meta) {
          cls.addGeneric(GenericSchema.create(g, config, references, meta));
        }
      });
    }

    if (Array.isArray(data.imports)) {
      data.imports.forEach((i) => {
        const meta = SchemaTools.executeMeta(i, references, config);
        if (meta) {
          cls.addImport(ImportSchema.create(i, config, references, meta));
        }
      });
    }

    return cls as T;
  }

  private __imports: ImportSchema[] = [];
  private __props: PropSchema[] = [];
  private __methods: MethodSchema[] = [];
  private __generics: GenericSchema[] = [];
  private __interfaces: InterfaceSchema[] = [];
  private __inheritance: InheritanceSchema[] = [];

  private constructor(
    public readonly isAbstract: boolean,
    public readonly name: string,
    public readonly exp: ExportSchema,
    public readonly ctor: ConstructorSchema,
    inheritance: InheritanceSchema[] = [],
    private template: string
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

  findImport(data: ImportData) {
    const { list, ...rest } = data;
    const restKeys = Object.keys(rest);

    return this.__imports.find((impt) => {
      const found =
        Array.isArray(list) && list.length > 0
          ? impt.list.some((i) => list.includes(i))
          : true;

      for (const key of restKeys) {
        const k = impt[key];
        if (k && k !== rest[key]) {
          return false;
        }
      }
      return found;
    });
  }

  hasImport(impt: ImportData) {
    const { dflt, path, alias, list } = impt;

    return (
      this.__imports.findIndex(
        (p) =>
          p.path === path &&
          p.alias === alias &&
          p.dflt === dflt &&
          list.every((i) => p.list.includes(i))
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

  addInterface(intf: InterfaceSchema) {
    if (this.hasInterface(intf.name) === false) {
      this.__interfaces.push(intf);
    }
  }

  findInterface(name: string) {
    return this.__interfaces.find((p) => p.name === name);
  }

  hasInterface(name: string) {
    return this.__interfaces.findIndex((p) => p.name === name) !== -1;
  }

  get interfaces() {
    return [...this.__interfaces];
  }

  toObject(): ClassSchemaObject {
    const {
      name,
      ctor,
      exp,
      isAbstract,
      __inheritance,
      __methods,
      __props,
      __generics,
      __interfaces,
      __imports,
      template,
    } = this;

    const cls: ClassSchemaObject = {
      is_abstract: isAbstract,
      name,
      inheritance: __inheritance?.map((i) => i.toObject()),
      ctor: ctor?.toObject(),
      exp: exp?.toObject(),
      methods: __methods.map((i) => i.toObject()),
      props: __props.map((p) => p.toObject()),
      generics: __generics.map((g) => g.toObject()),
      interfaces: __interfaces.map((i) => i.toObject()),
      imports: __imports.map((i) => i.toObject()),
      template,
    };

    return cls;
  }

  listTypes() {
    const { inheritance, __methods, __generics, __props, __interfaces } = this;
    const types: TypeInfo[] = [];

    __generics.forEach((g) => {
      types.push(...g.listTypes());
    });

    __props.forEach((p) => {
      types.push(...p.listTypes());
    });

    __methods.forEach((m) => {
      types.push(...m.listTypes());
    });

    __interfaces.forEach((i) => {
      types.push(...i.listTypes());
    });

    inheritance.forEach((i) => {
      types.push(...i.listTypes());
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
