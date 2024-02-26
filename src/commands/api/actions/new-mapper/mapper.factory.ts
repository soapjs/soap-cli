import { MapperAddons, MapperData, MapperElement } from "./types";
import { Entity } from "../new-entity";
import { Model } from "../new-model";
import {
  Component,
  ClassData,
  ClassSchema,
  Config,
  MapperType,
} from "../../../../core";
import { nanoid } from "nanoid";
import { WriteMethod } from "@soapjs/soap-cli-common";

export class MapperFactory {
  static create(
    data: MapperData,
    entity: Entity,
    model: Model,
    writeMethod: WriteMethod,
    config: Config
  ): Component<MapperElement, MapperAddons> {
    const dependencies = [model, entity];
    const { id, name, storage, endpoint } = data;
    const { defaults } = config.components.mapper;
    const addons = { storage };
    const interfaces = [];
    const methods = [];
    const props = [];
    const generics = [];
    const imports = [];
    let inheritance = [];
    let ctor;
    let exp;

    const componentName = config.components.mapper.generateName(name, {
      type: storage,
    });
    const componentPath = config.components.mapper.generatePath({
      name,
      type: storage,
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
      interfaces.push(...defaults[storage].interfaces);
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

    const classData: ClassData = {
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
      is_abstract: config.components.mapper.elementType === "abstract_class",
    };

    const element = ClassSchema.create<MapperElement>(classData, config, {
      addons,
      dependencies,
    });

    const component = Component.create<MapperElement, MapperAddons>(config, {
      id: nanoid(),
      type: MapperType.create(componentName, name, storage),
      endpoint,
      path: componentPath,
      writeMethod,
      addons,
      element,
      dependencies,
    });

    return component;
  }
}
