import { nanoid } from "nanoid";
import {
  ClassJson,
  ClassSchema,
  Component,
  Config,
  Entity,
  EntityAddons,
  EntityData,
  EntityElement,
  EntityType,
  Model,
  WriteMethod,
} from "@soapjs/soap-cli-common";

export class EntityFactory {
  static create(
    data: EntityData,
    model: Model,
    writeMethod: WriteMethod,
    config: Config,
    dependencies: Component[]
  ): Entity {
    const { id, name, endpoint } = data;
    const addons = { hasModel: !!model };
    const { defaults } = config.components.entity;
    const componentName = config.components.entity.generateName(name);
    const componentPath = config.components.entity.generatePath({
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
        is_abstract: config.components.entity.elementType === "abstract_class",
      } as ClassJson,
      config,
      {
        addons,
        dependencies: [model, ...dependencies],
      }
    );

    const component = Component.create<EntityElement, EntityAddons>(config, {
      id: id || nanoid(),
      type: EntityType.create(componentName, name),
      endpoint,
      path: componentPath,
      writeMethod,
      addons,
      element,
      dependencies,
    });

    if (model) {
      component.addDependency(model, config);
    }

    return component;
  }
}
