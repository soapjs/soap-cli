import {
  InheritanceJson,
  InheritanceSchemaObject,
} from "@soapjs/soap-cli-common";
import { Config, ConfigInstructionParser } from "../../config";
import { SchemaTools } from "../schema.tools";
import { GenericData, GenericSchema } from "./generic.schema";

export type InheritanceData = {
  generics?: GenericData[];
  name?: string;
};

export class InheritanceSchema {
  public static create(
    data: string | InheritanceData | InheritanceJson,
    config: Config,
    references?: { [key: string]: unknown; dependencies: any[] },
    meta?: any
  ) {
    if (!data) {
      return null;
    }

    let inth;
    let name: string;
    let generics = [];

    if (typeof data === "string") {
      const temp = data.trim();

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
      const temp = data.name.trim();

      if (ConfigInstructionParser.hasInstructions(temp)) {
        name = ConfigInstructionParser.executeInstructions(
          temp,
          references,
          config
        );
      } else {
        name = temp;
      }

      if (Array.isArray(data.generics)) {
        generics = [...data.generics];
      }
    }

    inth = new InheritanceSchema(name, meta);

    generics.forEach((g) => {
      const meta = SchemaTools.executeMeta(g, references, config);
      if (meta) {
        inth.addGeneric(GenericSchema.create(g, config, references, meta));
      }
    });

    return inth;
  }

  private __generics: GenericSchema[] = [];

  private constructor(
    public readonly name: string,
    public readonly meta?: any
  ) {}

  addGeneric(generic: GenericSchema) {
    if (this.hasGeneric(generic) === false) {
      this.__generics.push(generic);
    }
  }

  findGeneric(name: string) {
    return this.__generics.find((p) => p.name === name);
  }

  hasGeneric(generic: GenericSchema) {
    return (
      this.__generics.findIndex(
        (g) =>
          g.name === generic.name &&
          g.dflt === generic.dflt &&
          g.inheritance?.name === generic.inheritance?.name
      ) !== -1
    );
  }

  get generics() {
    return [...this.__generics];
  }

  toObject(): InheritanceSchemaObject {
    const { name, __generics, meta } = this;
    const intf: InheritanceSchemaObject = {
      name,
      generics: __generics.map((g) => g.toObject()),
      meta,
    };

    return intf;
  }

  listTypes() {
    const { __generics } = this;
    const list = [];

    __generics.forEach((g) => {
      list.push(...g.listTypes());
    });

    return list;
  }
}
