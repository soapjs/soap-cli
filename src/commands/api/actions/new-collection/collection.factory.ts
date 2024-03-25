import { nanoid } from "nanoid";
import {
  ClassSchema,
  CollectionAddons,
  CollectionElement,
  CollectionType,
  Component,
  Config,
  Model,
} from "@soapjs/soap-cli-common";
import { CollectionFactoryInput } from "./types";

export class CollectionFactory {
  public static create(
    data: CollectionFactoryInput,
    model: Model,
    config: Config
  ): Component<CollectionElement, CollectionAddons> {
    const dependencies = [model];
    const { id, name, type, table, endpoint, is_custom, write_method } = data;
    const { defaults } = config.presets.collection;
    const addons = { type, table, is_custom };
    const interfaces = [];
    const methods = [];
    const props = [];
    const generics = [];
    const imports = [];
    let inheritance = [];
    let ctor;
    let exp;
    const componentName = config.presets.collection.generateName(name, {
      type,
    });
    const componentPath = config.presets.collection.generatePath({
      name,
      type,
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

    if (defaults?.[type]?.ctor) {
      ctor = defaults[type].ctor;
    }

    if (Array.isArray(defaults?.[type]?.inheritance)) {
      inheritance.push(...defaults[type].inheritance);
    }

    if (Array.isArray(defaults?.[type]?.imports)) {
      defaults[type].imports.forEach((i) => {
        i.ref_path = componentPath;
        imports.push(i);
      });
    }

    if (Array.isArray(defaults?.[type]?.interfaces)) {
      imports.push(...defaults[type].interfaces);
    }

    if (Array.isArray(defaults?.[type]?.methods)) {
      methods.push(...defaults[type].methods);
    }

    if (Array.isArray(defaults?.[type]?.props)) {
      props.push(...defaults[type].props);
    }

    if (Array.isArray(data.props)) {
      props.push(...data.props);
    }

    if (Array.isArray(data.methods)) {
      methods.push(...data.methods);
    }

    if (Array.isArray(defaults?.[type]?.generics)) {
      generics.push(...defaults[type].generics);
    }

    const element = ClassSchema.create<CollectionElement>(
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
        is_abstract: config.presets.collection.elementType === "abstract_class",
      },
      write_method,
      config,
      {
        addons,
        dependencies,
      }
    );

    const component = Component.create<CollectionElement, CollectionAddons>(
      config,
      {
        id: id || nanoid(),
        type: CollectionType.create(componentName, name, type),
        endpoint,
        path: componentPath,
        writeMethod: write_method,
        addons,
        element,
        dependencies,
      }
    );

    return component;
  }
}
