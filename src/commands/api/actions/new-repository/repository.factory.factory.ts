import {
  DataContext,
  Repository,
  RepositoryData,
  RepositoryElement,
  RepositoryImpl,
} from "./types";
import { Entity } from "../new-entity";
import { RepositoryFactoryType } from "../../../../core/type.info";
import { ClassData, ClassSchema, Component, Config } from "../../../../core";
import { nanoid } from "nanoid";
import { WriteMethod } from "@soapjs/soap-cli-common";

export class RepositoryFactoryFactory {
  static create(
    data: RepositoryData,
    entity: Entity,
    repository: Repository,
    impl: RepositoryImpl,
    contexts: DataContext[],
    writeMethod: WriteMethod,
    config: Config
  ): Component<RepositoryElement> {
    const dependencies: Component[] = [];
    const { id, name, endpoint } = data;
    const { defaults } = config.components.repository_factory;
    const addons = {};
    const interfaces = [];
    const methods = [];
    const props = [];
    const generics = [];
    const imports = [];
    let inheritance = [];
    let ctor: any = { params: [], supr: null };
    let exp;

    const componentName =
      config.components.repository_factory.generateName(name);
    const componentPath = config.components.repository_factory.generatePath({
      name,
      endpoint,
    }).path;

    if (defaults?.common?.exp) {
      exp = defaults.common.exp;
    }

    if (defaults?.common?.ctor) {
      if (Array.isArray(defaults.common.ctor.params)) {
        ctor.params.push(...defaults.common.ctor.params);
      }
      if (defaults.common.ctor.supr) {
        ctor.supr = defaults.common.ctor.supr;
      }
    }

    if (Array.isArray(defaults?.common?.inheritance)) {
      inheritance.push(...defaults.common.inheritance);
    }

    if (Array.isArray(defaults?.common?.imports)) {
      defaults.common.imports.forEach((i) => {
        i.ref_path = componentPath;
        imports.push(i);
      });
    }

    if (Array.isArray(defaults?.common?.interfaces)) {
      interfaces.push(...defaults.common.interfaces);
    }

    if (Array.isArray(defaults?.common?.methods)) {
      methods.push(...defaults.common.methods);
    }

    if (Array.isArray(defaults?.common?.props)) {
      props.push(...defaults.common.props);
    }

    if (Array.isArray(defaults?.common?.generics)) {
      generics.push(...defaults.common.generics);
    }

    for (const context of contexts) {
      const storage = context.model.type.type;

      dependencies.push(context.model);

      if (Array.isArray(defaults?.[storage]?.ctor?.params)) {
        ctor.params.push(...defaults[storage].ctor.params);
      }

      if (Array.isArray(defaults?.[storage]?.inheritance)) {
        inheritance.push(...defaults[storage].inheritance);
      }

      if (Array.isArray(defaults?.[storage]?.imports)) {
        defaults[storage].imports.forEach((i) => {
          i.ref_path = componentPath;
          imports.push(i);
        });
      }

      if (Array.isArray(defaults?.[storage]?.interfaces)) {
        imports.push(...defaults[storage].interfaces);
      }

      if (Array.isArray(defaults?.[storage]?.methods)) {
        methods.push(...defaults[storage].methods);
      }

      if (Array.isArray(defaults?.[storage]?.props)) {
        props.push(...defaults[storage].props);
      }

      if (Array.isArray(data.props)) {
        props.push(...data.props);
      }

      if (Array.isArray(data.methods)) {
        methods.push(...data.methods);
      }

      if (Array.isArray(defaults?.[storage]?.generics)) {
        generics.push(...defaults[storage].generics);
      }
    }
    const classData: ClassData = {
      id,
      name: componentName,
      props,
      methods,
      interfaces,
      generics,
      inheritance,
      ctor,
      imports,
      exp,
    };

    const element = ClassSchema.create<RepositoryElement>(classData, config, {
      addons,
      dependencies,
    });

    const component = Component.create<RepositoryElement>(config, {
      id: id || nanoid(),
      type: RepositoryFactoryType.create(componentName, name),
      endpoint,
      path: componentPath,
      writeMethod,
      addons,
      element,
      dependencies: [],
    });

    component.addDependency(entity, config);
    component.addDependency(repository, config);
    component.addDependency(impl, config);

    contexts.forEach((ctx) => {
      if (ctx.mapper) {
        component.addDependency(ctx.mapper, config);
      }
      if (ctx.source) {
        component.addDependency(ctx.source, config);
      }
      component.addDependency(ctx.model, config);
    });

    return component;
  }
}
