import {
  ClassData,
  ClassSchema,
  Component,
  Config,
  ConstructorDataParser,
  DataContext,
  DataProvider,
  ParamDataParser,
  RepositoryElement,
  RepositoryImplType,
} from "@soapjs/soap-cli-common";
import { RepositoryFactoryInput } from "../types";
import {
  DefaultGroups,
  InputToDataParser,
} from "../../../common/input-to-data.parser";

export class RepositoryImplFactory {
  static create(
    input: RepositoryFactoryInput,
    contexts: DataContext[],
    config: Config,
    dependencies: Component[]
  ): Component<RepositoryElement> {
    const { id, name, endpoint, is_custom, write_method } = input;
    const references = {
      addons: { is_custom },
      dependencies: dependencies || [],
    };
    contexts.forEach((ctx) => {
      references.dependencies.push(ctx.model);
    });

    const types = contexts.map((c) => c.model.type.type);
    const parser = new InputToDataParser(config);
    const data = parser.parse<ClassData>(
      "repository_impl",
      input,
      new DefaultGroups(["common", ...types]),
      references
    );

    if (config.presets.repository_impl.defaults.common.ctor) {
      data.element.ctor = ConstructorDataParser.parse(
        config.presets.repository_impl.defaults.common.ctor,
        config,
        references
      ).data;

      for (const context of contexts) {
        const ctxCtor =
          config.presets.repository_impl.defaults[context.model.type.type].ctor;

        if (Array.isArray(ctxCtor.params)) {
          ctxCtor.params.forEach((param) => {
            data.element.ctor.params.push(
              ParamDataParser.parse(param, config, references).data
            );
          });
        }
      }
    }

    const element = ClassSchema.create<RepositoryElement>(
      new DataProvider(data.element),
      write_method,
      config,
      references
    );

    const component = Component.create<RepositoryElement>(config, {
      id,
      type: RepositoryImplType.create(data.element.name, name),
      endpoint,
      path: data.path,
      writeMethod: write_method,
      addons: null,
      element,
      dependencies,
    });

    return component;
  }
}
/*
export class RepositoryImplFactory {
  static create(
    data: RepositoryFactoryInput,
    contexts: DataContext[],
    config: Config,
    dependencies: Component[]
  ): Component<RepositoryElement> {
    const { id, name, endpoint, is_custom, write_method } = data;
    const { defaults } = config.presets.repository_impl;
    const addons = { is_custom };
    const interfaces = [];
    const methods = [];
    const props = [];
    const generics = [];
    const imports = [];
    let inheritance = [];
    let ctor: any = { params: [], supr: null };
    let exp;

    const componentName = config.presets.repository_impl.generateName(name);
    const componentPath = config.presets.repository_impl.generatePath({
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

    const element = ClassSchema.create<RepositoryElement>(
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
        is_abstract:
          config.presets.repository_impl.elementType === "abstract_class",
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
      type: RepositoryImplType.create(componentName, name),
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
*/
