import { nanoid } from "nanoid";
import {
  ClassSchema,
  Component,
  Config,
  Entity,
  MapperAddons,
  MapperElement,
  MapperType,
  Model,
} from "@soapjs/soap-cli-common";
import { MapperFactoryInput } from "./types";

export class MapperFactory {
  static create(
    data: MapperFactoryInput,
    entity: Entity,
    model: Model,
    config: Config
  ): Component<MapperElement, MapperAddons> {
    const dependencies = [model, entity];
    const { id, name, type, endpoint, write_method } = data;
    const { defaults } = config.presets.mapper;
    const addons = { type };
    const interfaces = [];
    const methods = [];
    const props = [];
    const generics = [];
    const imports = [];
    let inheritance = [];
    let ctor;
    let exp;

    const componentName = config.presets.mapper.generateName(name, {
      type,
    });
    const componentPath = config.presets.mapper.generatePath({
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
      interfaces.push(...defaults[type].interfaces);
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

    const element = ClassSchema.create<MapperElement>(
      {
        id,
        name: componentName,
        props,
        methods,
        interfaces,
        generics,
        inheritance,
        ctor,
        exp,
        imports,
        is_abstract: config.presets.mapper.elementType === "abstract_class",
      },
      write_method,
      config,
      {
        addons,
        dependencies,
      }
    );

    const component = Component.create<MapperElement, MapperAddons>(config, {
      id: nanoid(),
      type: MapperType.create(componentName, name, type),
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
