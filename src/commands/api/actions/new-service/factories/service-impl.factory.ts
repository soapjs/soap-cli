import {
  ClassSchema,
  Component,
  Config,
  Service,
  ServiceElement,
  ServiceImplType,
} from "@soapjs/soap-cli-common";
import { ServiceFactoryInput } from "../types";

export class ServiceImplFactory {
  static create(
    data: ServiceFactoryInput,
    service: Service,
    config: Config
  ): Component<ServiceElement> {
    const dependencies: Component[] = [];
    const { id, name, endpoint, write_method } = data;
    const { defaults } = config.presets.service_impl;
    const addons = {};
    const interfaces = [];
    const methods = [];
    const props = [];
    const generics = [];
    const imports = [];
    let inheritance = [];
    let ctor: any = { params: [], supr: null };
    let exp;

    const componentName = config.presets.service_impl.generateName(name);
    const componentPath = config.presets.service_impl.generatePath({
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

    if (service) {
      dependencies.push(service);
      interfaces.push(service.type.name);
    }

    const element = ClassSchema.create<ServiceElement>(
      {
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
      },
      write_method,
      config,
      {
        addons,
        dependencies,
      }
    );

    if (Array.isArray(service?.element.methods)) {
      service.element.methods.forEach((method) => {
        element.addMethod(method);
      });
    }

    if (Array.isArray(service?.element.props)) {
      service.element.props.forEach((prop) => {
        element.addProp(prop);
      });
    }

    const component = Component.create<ServiceElement>(config, {
      id,
      type: ServiceImplType.create(componentName, name),
      endpoint,
      path: componentPath,
      writeMethod: write_method,
      addons: null,
      element,
      dependencies,
    });

    return component;
  }
}
