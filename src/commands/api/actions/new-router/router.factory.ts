import { nanoid } from "nanoid";
import {
  ClassData,
  ClassSchema,
  Config,
  Router,
  RouterElement,
  RouterType,
  WriteMethod,
} from "@soapjs/soap-cli-common";

export class RouterFactory {
  public static create(config: Config): Router {
    const { defaults } = config.presets.router;
    const interfaces = [];
    const methods = [];
    const props = [];
    const generics = [];
    const imports = [];
    const addons = { routes: [] };
    let inheritance = [];
    let ctor;
    let exp;

    const componentName = config.presets.router.generateName("router");
    const componentPath = config.presets.router.generatePath({
      name: "router",
    }).path;

    if (defaults?.common?.exp) {
      exp = defaults.common.exp;
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

    const element = ClassSchema.create<RouterElement>(
      {
        name: componentName,
        props,
        methods,
        interfaces,
        generics,
        inheritance,
        imports,
        ctor,
        exp,
        is_abstract: false,
      },
      WriteMethod.Write,
      config,
      {
        addons,
        dependencies: [],
      }
    );

    return new Router(
      nanoid(),
      RouterType.create(componentName, "router"),
      componentPath,
      WriteMethod.Write,
      addons,
      element
    );
  }
}
