import { nanoid } from "nanoid";
import {
  ClassData,
  ClassSchema,
  CollectionAddons,
  CollectionElement,
  CollectionType,
  Component,
  Config,
  DataProvider,
  Model,
} from "@soapjs/soap-cli-common";
import { CollectionFactoryInput } from "./types";
import {
  DefaultGroups,
  InputToDataParser,
} from "../../common/input-to-data.parser";

export class CollectionFactory {
  public static create(
    input: CollectionFactoryInput,
    model: Model,
    config: Config
  ): Component<CollectionElement, CollectionAddons> {
    const dependencies = [model];
    const { id, name, type, table, endpoint, is_custom, write_method } = input;
    const references = {
      addons: { type, table, is_custom },
      dependencies: dependencies || [],
    };
    const parser = new InputToDataParser(config);
    const data = parser.parse<ClassData>(
      "collection",
      input,
      new DefaultGroups(["common", type]),
      references
    );

    const element = ClassSchema.create<CollectionElement>(
      new DataProvider(data.element),
      config,
      references
    );

    const component = Component.create<CollectionElement, CollectionAddons>(
      config,
      {
        id: id || nanoid(),
        type: CollectionType.create(data.element.name, name, type),
        endpoint,
        path: data.path,
        writeMethod: write_method,
        addons: references.addons,
        element,
        dependencies: references.dependencies,
        rank: data.element.rank,
      }
    );

    return component;
  }
}
