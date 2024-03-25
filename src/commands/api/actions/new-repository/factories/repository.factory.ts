import {
  ClassData,
  ClassSchema,
  Component,
  Config,
  DataProvider,
  RepositoryElement,
  RepositoryType,
} from "@soapjs/soap-cli-common";
import { RepositoryFactoryInput } from "../types";
import {
  DefaultGroups,
  InputToDataParser,
} from "../../../common/input-to-data.parser";

export class RepositoryFactory {
  static create(
    input: RepositoryFactoryInput,
    config: Config,
    dependencies: Component[]
  ): Component<RepositoryElement> {
    const { id, name, endpoint, write_method } = input;
    const references = {
      addons: {},
      dependencies: dependencies || [],
    };
    const parser = new InputToDataParser(config);
    const data = parser.parse<ClassData>(
      "repository",
      input,
      new DefaultGroups(["common"]),
      references
    );
    const element = ClassSchema.create<RepositoryElement>(
      new DataProvider(data.element),
      write_method,
      config,
      references
    );

    const component = Component.create<RepositoryElement>(config, {
      id,
      type: RepositoryType.create(data.element.name, name),
      endpoint,
      path: data.path,
      writeMethod: write_method,
      addons: references.addons,
      element,
      dependencies: references.dependencies,
    });

    return component;
  }
}
/*
export class RepositoryFactory {
  static create(
    data: RepositoryFactoryInput,
    config: Config,
    dependencies: Component[]
  ): Component<RepositoryElement> {
    const { id, name, endpoint, write_method } = data;
    const { defaults } = config.presets.repository;
    const addons = {};
    const interfaces = [];
    const methods = [];
    const props = [];
    const generics = [];
    const imports = [];
    let inheritance = [];
    let ctor;
    let exp;

    const componentName = config.presets.repository.generateName(name);
    const componentPath = config.presets.repository.generatePath({
      name,
      endpoint,
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

    if (Array.isArray(data.props)) {
      props.push(...data.props);
    }

    if (Array.isArray(data.methods)) {
      methods.push(...data.methods);
    }

    const element = ClassSchema.create<RepositoryElement>(
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
        is_abstract: config.presets.repository.elementType === "abstract_class",
      },
      write_method,
      config,
      {
        addons,
        dependencies,
      }
    );

    const component = Component.create<RepositoryElement>(config, {
      id,
      type: RepositoryType.create(componentName, name),
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

*/
