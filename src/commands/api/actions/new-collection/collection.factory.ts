import { CollectionAddons, CollectionData, CollectionElement } from "./types";
import { Model } from "../new-model";
import { CollectionType } from "../../../../core/type.info";
import { ClassData, ClassSchema, Component, Config } from "../../../../core";
import { nanoid } from "nanoid";
import { WriteMethod } from "@soapjs/soap-cli-common";

export class CollectionFactory {
  public static create(
    data: CollectionData,
    model: Model,
    writeMethod: WriteMethod,
    config: Config
  ): Component<CollectionElement, CollectionAddons> {
    const dependencies = [model];
    const { id, name, storage, table, endpoint, is_custom } = data;
    const { defaults } = config.components.collection;
    const addons = { storage, table, is_custom };
    const interfaces = [];
    const methods = [];
    const props = [];
    const generics = [];
    const imports = [];
    let inheritance = [];
    let ctor;
    let exp;
    const componentName = config.components.collection.generateName(name, {
      type: storage,
    });
    const componentPath = config.components.collection.generatePath({
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

    if (defaults?.[storage]?.ctor) {
      ctor = defaults[storage].ctor;
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
      is_abstract:
        config.components.collection.elementType === "abstract_class",
    };

    const element = ClassSchema.create<CollectionElement>(classData, config, {
      addons,
      dependencies,
    });

    const component = Component.create<CollectionElement, CollectionAddons>(
      config,
      {
        id: id || nanoid(),
        type: CollectionType.create(componentName, name, storage),
        endpoint,
        path: componentPath,
        writeMethod,
        addons,
        element,
        dependencies,
      }
    );

    return component;
  }
}
