import { nanoid } from "nanoid";
import {
  ClassJson,
  ClassSchema,
  Component,
  Config,
  Toolset,
  ToolsetElement,
  ToolsetType,
} from "@soapjs/soap-cli-common";
import { ToolsetFactoryInput } from "./types";

export class ToolsetFactory {
  static create(
    data: ToolsetFactoryInput,
    config: Config,
    dependencies: Component[]
  ): Toolset {
    const { id, name, endpoint, layer, write_method } = data;
    const addons = {};
    const { defaults } = config.presets.toolset;
    const componentName = config.presets.toolset.generateName(name, {
      layer,
    });
    const componentPath = config.presets.toolset.generatePath({
      name,
      endpoint,
      layer,
    }).path;
    const props = [];
    const methods = [];
    const imports = [];
    const generics = [];
    const inheritance = [];
    let ctor;
    let exp;

    if (defaults?.common?.exp) {
      exp = defaults.common.exp;
    }

    if (defaults?.common.ctor) {
      ctor = defaults.common.ctor;
    }

    if (Array.isArray(defaults?.common?.methods)) {
      methods.push(...defaults.common.methods);
    }

    if (Array.isArray(defaults?.common?.inheritance)) {
      inheritance.push(...defaults.common.inheritance);
    }

    if (Array.isArray(defaults?.common?.props)) {
      props.push(...defaults.common.props);
    }

    if (Array.isArray(data.props)) {
      props.push(...data.props);
    }

    if (Array.isArray(data.methods)) {
      methods.push(...data.methods);
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

    const element = ClassSchema.create<ToolsetElement>(
      {
        name: componentName,
        props,
        methods,
        generics,
        imports,
        ctor,
        inheritance,
        exp,
        is_abstract: config.presets.toolset.elementType === "abstract_class",
      } as ClassJson,
      write_method,
      config,
      {
        addons,
        dependencies,
      }
    );

    const component = Component.create<ToolsetElement>(config, {
      id: id || nanoid(),
      type: ToolsetType.create(componentName, name),
      endpoint,
      path: componentPath,
      writeMethod: write_method,
      addons,
      element,
      dependencies,
    });

    return component;
  }
}
