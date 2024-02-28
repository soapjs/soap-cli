import { nanoid } from "nanoid";
import {
  ClassData,
  ClassSchema,
  Component,
  Config,
  RouterElement,
  RouterType,
  WriteMethod,
} from "@soapjs/soap-cli-common";

export class RouterFactory {
  public static create(config: Config): Component<
    RouterElement,
    {
      routes: {
        name: string;
        path: string;
        controller: string;
        handler: string;
      }[];
    }
  > {
    const { defaults } = config.components.router;
    const interfaces = [];
    const methods = [];
    const props = [];
    const generics = [];
    const imports = [];
    let inheritance = [];
    let ctor;
    let exp;

    const componentName = config.components.router.generateName("routes");
    const componentPath = config.components.router.generatePath({
      name: "routes",
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

    const classData: ClassData = {
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
    };

    const element = ClassSchema.create<RouterElement>(classData, config, {
      addons: {},
      dependencies: [],
    });

    const component = Component.create<
      RouterElement,
      {
        routes: {
          name: string;
          path: string;
          controller: string;
          handler: string;
        }[];
      }
    >(config, {
      id: nanoid(),
      type: RouterType.create(componentName, "routes"),
      path: componentPath,
      writeMethod: WriteMethod.Write,
      element,
      addons: { routes: [] },
    });

    return component;
  }
}
