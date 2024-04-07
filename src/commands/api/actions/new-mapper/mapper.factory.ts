import { nanoid } from "nanoid";
import {
  ClassData,
  ClassSchema,
  Component,
  Config,
  DataProvider,
  Entity,
  MapperAddons,
  MapperElement,
  MapperType,
  Model,
} from "@soapjs/soap-cli-common";
import { MapperFactoryInput } from "./types";
import {
  DefaultGroups,
  InputToDataParser,
} from "../../common/input-to-data.parser";

export class MapperFactory {
  static create(
    input: MapperFactoryInput,
    entity: Entity,
    model: Model,
    config: Config
  ): Component<MapperElement, MapperAddons> {
    const dependencies = [model, entity];
    const { name, type, endpoint, write_method } = input;
    const references = {
      addons: { type },
      dependencies: dependencies || [],
    };
    const parser = new InputToDataParser(config);
    const data = parser.parse<ClassData>(
      "mapper",
      input,
      new DefaultGroups(["common", type]),
      references
    );

    const element = ClassSchema.create<MapperElement>(
      new DataProvider(data.element),
      config,
      references
    );

    const component = Component.create<MapperElement, MapperAddons>(config, {
      id: nanoid(),
      type: MapperType.create(data.element.name, name, type),
      endpoint,
      path: data.path,
      writeMethod: write_method,
      addons: references.addons,
      element,
      dependencies: references.dependencies,
      rank: data.element.rank,
    });

    return component;
  }
}
