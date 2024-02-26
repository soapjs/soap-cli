import { UseCaseData, UseCaseElement } from "./types";
import {
  ClassData,
  ClassSchema,
  Component,
  Config,
  TypeInfo,
  UseCaseType,
} from "../../../../core";
import { WriteMethod } from "@soapjs/soap-cli-common";

export class UseCaseFactory {
  public static create(
    data: UseCaseData,
    output: Component,
    writeMethod: WriteMethod,
    config: Config
  ): Component<UseCaseElement> {
    const dependencies = [];
    const { id, name, endpoint } = data;
    const { defaults } = config.components.use_case;

    const addons = {
      input: data.input,
      output: output?.type || TypeInfo.create(data.output, config),
    };

    const interfaces = [];
    const methods = [];
    const props = [];
    const generics = [];
    const imports = [];
    let inheritance = [];
    let ctor;
    let exp;

    const componentName = config.components.use_case.generateName(name);
    const componentPath = config.components.use_case.generatePath({
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
      is_abstract: config.components.use_case.elementType === "abstract_class",
    };

    const element = ClassSchema.create<UseCaseElement>(classData, config, {
      addons,
      dependencies,
    });

    const component = Component.create<UseCaseElement>(config, {
      id,
      type: UseCaseType.create(componentName, name),
      endpoint,
      path: componentPath,
      writeMethod,
      addons: {},
      element,
      dependencies,
    });

    return component;
  }
}
