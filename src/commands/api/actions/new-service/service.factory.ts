import { nanoid } from "nanoid";
import {
  ClassJson,
  ClassSchema,
  Component,
  Config,
  Service,
  ServiceData,
  ServiceElement,
  ServiceType,
  WriteMethod,
} from "@soapjs/soap-cli-common";

export class ServiceFactory {
  static create(
    data: ServiceData,
    writeMethod: WriteMethod,
    config: Config,
    dependencies: Component[]
  ): Service {
    const { id, name, endpoint } = data;
    const addons = {};
    const { defaults } = config.components.service;
    const componentName = config.components.service.generateName(name);
    const componentPath = config.components.service.generatePath({
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

    const element = ClassSchema.create<ServiceElement>(
      {
        name: componentName,
        props,
        methods,
        generics,
        imports,
        ctor,
        inheritance,
        exp,
        is_abstract: config.components.service.elementType === "abstract_class",
      } as ClassJson,
      config,
      {
        addons,
        dependencies,
      }
    );

    const component = Component.create<ServiceElement>(config, {
      id: id || nanoid(),
      type: ServiceType.create(componentName, name),
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
