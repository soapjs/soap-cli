import {
  ClassData,
  ClassSchema,
  Component,
  Config,
  DataContext,
  Entity,
  Repository,
  RepositoryData,
  RepositoryElement,
  RepositoryImplType,
  Service,
  ServiceData,
  ServiceElement,
  ServiceImplType,
  WriteMethod,
} from "@soapjs/soap-cli-common";

export class ServiceImplFactory {
  static create(
    data: ServiceData,
    service: Service,
    writeMethod: WriteMethod,
    config: Config
  ): Component<RepositoryElement> {
    const dependencies: Component[] = [service];
    const { id, name, endpoint } = data;
    const { defaults } = config.components.service_impl;
    const addons = {};
    const interfaces = [];
    const methods = [];
    const props = [];
    const generics = [];
    const imports = [];
    let inheritance = [];
    let ctor: any = { params: [], supr: null };
    let exp;

    const componentName = config.components.service_impl.generateName(name);
    const componentPath = config.components.service_impl.generatePath({
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

    if (Array.isArray(service.element.methods)) {
      methods.push(...service.element.methods);
    }

    if (Array.isArray(service.element.props)) {
      props.push(...service.element.props);
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
      is_abstract: false,
    };

    const element = ClassSchema.create<ServiceElement>(classData, config, {
      addons,
      dependencies,
    });

    const component = Component.create<ServiceElement>(config, {
      id,
      type: ServiceImplType.create(componentName, name),
      endpoint,
      path: componentPath,
      writeMethod,
      addons: null,
      element,
      dependencies,
    });

    return component;
  }
}
