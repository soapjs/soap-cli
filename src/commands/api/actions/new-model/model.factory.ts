import { nanoid } from "nanoid";
import {
  Component,
  TypeSchema,
  TypeJson,
  Config,
  ModelType,
} from "../../../../core";
import { ModelData, ModelElement, ModelAddons, Model } from "./types";
import { WriteMethod } from "@soapjs/soap-cli-common";

export class ModelFactory {
  static create(
    data: ModelData,
    writeMethod: WriteMethod,
    config: Config,
    dependencies: Component[]
  ): Model {
    const { id, name, type, endpoint, alias } = data;
    const addons = { modelType: type };
    const { defaults } = config.components.model;
    const dbConfig = config.databases.find((d) => d.alias === type);
    const componentName = config.components.model.generateName(name, {
      type,
    });
    const typeLC = type.toLowerCase();
    const componentPath = config.components.model.generatePath({
      name,
      type,
      endpoint,
    }).path;
    const imports = [];
    const props = [];
    const generics = [];
    let exp;

    if (defaults?.common?.exp) {
      exp = defaults.common.exp;
    }

    if (Array.isArray(defaults?.common?.imports)) {
      defaults.common.imports.forEach((i) => {
        i.ref_path = componentPath;
        imports.push(i);
      });
    }

    if (Array.isArray(defaults?.common?.generics)) {
      generics.push(...defaults.common.generics);
    }

    if (Array.isArray(defaults?.common?.props)) {
      props.push(...defaults.common.props);
    }

    if (Array.isArray(defaults?.[typeLC]?.imports)) {
      defaults[typeLC].imports.forEach((i) => {
        i.ref_path = componentPath;
        imports.push(i);
      });
    }

    if (Array.isArray(defaults?.[typeLC]?.generics)) {
      generics.push(...defaults[typeLC].generics);
    }

    if (Array.isArray(defaults?.[typeLC]?.props)) {
      props.push(...defaults[typeLC].props);
    }

    if (Array.isArray(data.generics)) {
      generics.push(...data.generics);
    }

    if (Array.isArray(data.props)) {
      props.push(...data.props);
    }

    if (dbConfig) {
      props.forEach((p) => {
        const mapping = dbConfig.mappings.find((m) => m.codeType === p.type);
        if (mapping) {
          p.type = mapping.dbType;
        }
      });
    }

    const element = TypeSchema.create<ModelElement>(
      {
        name: componentName,
        type,
        props,
        generics,
        imports,
        alias,
        exp,
      } as TypeJson,
      config,
      {
        addons,
        dependencies,
      }
    );

    const component = Component.create<ModelElement, ModelAddons>(config, {
      id: id || nanoid(),
      type: ModelType.create(componentName, name, type),
      endpoint,
      path: componentPath,
      writeMethod,
      addons,
      element,
      dependencies,
    });

    return component;
  }
}
