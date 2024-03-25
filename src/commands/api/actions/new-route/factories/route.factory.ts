import { nanoid } from "nanoid";
import {
  ClassSchema,
  Component,
  Config,
  Controller,
  RouteAddons,
  RouteElement,
  RouteIO,
  RouteSchema,
  RouteType,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import { RouteFactoryInput } from "../types";

export class RouteFactory {
  public static create(
    data: RouteFactoryInput,
    controller: Controller,
    io: RouteIO,
    schema: RouteSchema,
    config: Config
  ): Component<RouteElement> {
    const dependencies = [];
    const {
      id,
      name,
      request: { method },
      endpoint,
      write_method,
    } = data;

    const componentName = config.presets.route.generateName(name, {
      type: method,
      method,
    });

    const componentPath = config.presets.route.generatePath({
      name,
      type: method,
      method,
      endpoint,
    }).path;

    const addons: RouteAddons = {
      path: data.request.path,
      controller: controller.type.name,
      handler: data.handler,
      io: io?.type.name,
      route: componentName,
    };

    if (typeof data.request.auth === "string") {
      addons.auth = {
        authenticator: config.project.auth_framework,
        type: data.request.auth,
      };
    } else if (data.request.auth && typeof data.request.auth === "object") {
      addons.auth = {
        authenticator: config.project.auth_framework,
        type: data.request.auth.type,
        operation: data.request.auth.operation,
        tokenExpiresIn: data.request.auth.token_expires_in,
      };
    }

    if (data.request.cors) {
      addons.cors = {
        origin: data.request.cors.origin,
        maxAge: data.request.cors.max_age,
        headers: data.request.cors.headers,
        credentials: data.request.cors.credentials,
        methods: data.request.cors.methods,
      };
    }

    if (data.request.rate_limiter) {
      addons.limiter = {
        maxRequests: data.request.rate_limiter.max_requests,
        windowMs: data.request.rate_limiter.window_ms,
        mandatory: data.request.rate_limiter.mandatory,
      };
    }

    if (data.request.validate) {
      addons.schema = {
        schema: schema.type.name,
        validator: config.project.valid_framework,
      };
    }

    const methodLC = method.toLowerCase();
    const { defaults } = config.presets.route;

    const interfaces = [];
    const methods = [];
    const props = [];
    const generics = [];
    const imports = [];
    let inheritance = [];
    let ctor;
    let exp;

    if (defaults?.common?.exp) {
      exp = defaults.common.exp;
    }

    if (io) {
      dependencies.push(io);
    }

    if (controller) {
      dependencies.push(controller);
    }

    if (schema) {
      dependencies.push(schema);
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

    const element = ClassSchema.create<RouteElement>(
      {
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
        is_abstract: config.presets.route.elementType === "abstract_class",
      },
      write_method,
      config,
      {
        addons,
        dependencies,
      }
    );

    const component = Component.create<RouteElement>(config, {
      id: id || nanoid(),
      type: RouteType.create(componentName, name, method),
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
