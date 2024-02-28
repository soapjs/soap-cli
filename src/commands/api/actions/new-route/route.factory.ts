import { nanoid } from "nanoid";
import {
  ClassData,
  ClassSchema,
  Component,
  Config,
  Controller,
  RouteData,
  RouteElement,
  RouteIO,
  RouteType,
  WriteMethod,
} from "@soapjs/soap-cli-common";

export class RouteFactory {
  public static create(
    data: RouteData,
    controller: Controller,
    io: RouteIO,
    writeMethod: WriteMethod,
    config: Config
  ): Component<RouteElement> {
    const dependencies = [];
    const {
      id,
      name,
      request: { method },
      endpoint,
    } = data;

    const methodLC = method.toLowerCase();
    const { defaults } = config.components.route;
    const addons: { path: string; controller: string; handler: string } = {
      path: data.request.path,
      controller: controller.type.name,
      handler: data.handler,
    };
    const interfaces = [];
    const methods = [];
    const props = [];
    const generics = [];
    const imports = [];
    let inheritance = [];
    let ctor;
    let exp;

    const componentName = config.components.route.generateName(name, {
      type: method,
      method,
    });

    const componentPath = config.components.route.generatePath({
      name,
      type: method,
      method,
      endpoint,
    }).path;

    if (defaults?.common?.exp) {
      exp = defaults.common.exp;
    }

    if (io) {
      dependencies.push(io);
    }

    if (controller) {
      dependencies.push(controller);
    }

    if (defaults?.common?.ctor) {
      ctor = defaults.common.ctor;
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
      imports.push(...defaults.common.interfaces);
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

    if (Array.isArray(defaults?.[methodLC]?.inheritance)) {
      inheritance.push(...defaults[methodLC].inheritance);
    }

    if (Array.isArray(defaults?.[methodLC]?.imports)) {
      defaults[methodLC].imports.forEach((i) => {
        i.ref_path = componentPath;
        imports.push(i);
      });
    }

    if (Array.isArray(defaults?.[methodLC]?.interfaces)) {
      imports.push(...defaults[methodLC].interfaces);
    }

    if (Array.isArray(defaults?.[methodLC]?.methods)) {
      methods.push(...defaults[methodLC].methods);
    }

    if (Array.isArray(defaults?.[methodLC]?.props)) {
      props.push(...defaults[methodLC].props);
    }

    if (Array.isArray(data.props)) {
      props.push(...data.props);
    }

    if (Array.isArray(data.methods)) {
      methods.push(...data.methods);
    }

    if (Array.isArray(defaults?.[methodLC]?.generics)) {
      generics.push(...defaults[methodLC].generics);
    }

    const classData: ClassData = {
      id,
      name: componentName,
      props,
      methods,
      interfaces,
      generics,
      inheritance,
      imports,
      ctor,
      exp,
      is_abstract: config.components.route.elementType === "abstract_class",
    };

    const element = ClassSchema.create<RouteElement>(classData, config, {
      addons,
      dependencies,
    });

    const component = Component.create<RouteElement>(config, {
      id: id || nanoid(),
      type: RouteType.create(componentName, name, method),
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
