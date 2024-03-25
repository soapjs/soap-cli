import { nanoid } from "nanoid";
import {
  ClassData,
  ClassSchema,
  Config,
  Container,
  ContainerAddons,
  ContainerElement,
  ContainerType,
  WriteMethod,
} from "@soapjs/soap-cli-common";

export class ContainerFactory {
  public static create(config: Config): Container {
    const { defaults } = config.presets.container;
    const interfaces = [];
    const methods = [];
    const props = [];
    const generics = [];
    const imports = [];
    let inheritance = [];
    let ctor;
    let exp;

    const componentName = config.presets.container.generateName("dependencies");
    const componentPath = config.presets.container.generatePath({
      name: "dependencies",
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

    const addons: ContainerAddons = {
      repositories: [],
      use_cases: [],
      controllers: [],
      toolsets: [],
      services: [],
    };
    const element = ClassSchema.create<ContainerElement>(
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

    return new Container(
      nanoid(),
      ContainerType.create(componentName, "dependencies"),
      componentPath,
      WriteMethod.Write,
      addons,
      element
    );
  }
}
