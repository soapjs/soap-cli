import { nanoid } from "nanoid";
import {
  Config,
  Component,
  ClassData,
  ClassSchema,
  ContainerType,
} from "../../../../core";
import { ContainerElement } from "./types";
import { WriteMethod } from "@soapjs/soap-cli-common";

export class ContainerFactory {
  public static create(config: Config): Component<ContainerElement> {
    const { defaults } = config.components.container;
    const interfaces = [];
    const methods = [];
    const props = [];
    const generics = [];
    const imports = [];
    let inheritance = [];
    let ctor;
    let exp;

    const componentName =
      config.components.container.generateName("dependencies");
    const componentPath = config.components.container.generatePath({
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

    const element = ClassSchema.create<ContainerElement>(classData, config, {
      addons: {},
      dependencies: [],
    });

    const component = Component.create<ContainerElement>(config, {
      id: nanoid(),
      type: ContainerType.create(componentName, "dependencies"),
      path: componentPath,
      writeMethod: WriteMethod.Write,
      element,
    });

    return component;
  }
}
