import { nanoid } from "nanoid";
import {
  ClassSchema,
  Component,
  Config,
  Entity,
  EntityAddons,
  EntityElement,
  EntityType,
  Model,
} from "@soapjs/soap-cli-common";
import { EntityFactoryInput } from "./types";

export class EntityFactory {
  static create(
    data: EntityFactoryInput,
    model: Model,
    config: Config,
    dependencies?: Component[]
  ): Entity {
    const _dependencies = dependencies || [];
    const { id, name, endpoint, write_method } = data;
    const addons = { hasModel: !!model };
    const { defaults } = config.presets.entity;
    const componentName = config.presets.entity.generateName(name);
    const componentPath = config.presets.entity.generatePath({
      name,
      endpoint,
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

    const element = ClassSchema.create<EntityElement>(
      {
        name: componentName,
        props,
        methods,
        generics,
        imports,
        ctor,
        inheritance,
        exp,
        is_abstract: config.presets.entity.elementType === "abstract_class",
      },
      write_method,
      config,
      {
        addons,
        dependencies: [model, ..._dependencies],
      }
    );

    const component = Component.create<EntityElement, EntityAddons>(config, {
      id: id || nanoid(),
      type: EntityType.create(componentName, name),
      endpoint,
      path: componentPath,
      writeMethod: write_method,
      addons,
      element,
      dependencies: _dependencies,
    });

    if (model) {
      component.addDependency(model, config);
    }

    return component;
  }
}
