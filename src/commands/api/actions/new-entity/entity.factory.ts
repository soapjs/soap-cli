import { nanoid } from "nanoid";
import {
  ClassData,
  ClassSchema,
  Component,
  Config,
  DataProvider,
  Entity,
  EntityAddons,
  EntityElement,
  EntityType,
  Model,
} from "@soapjs/soap-cli-common";
import { EntityFactoryInput } from "./types";
import {
  DefaultGroups,
  InputToDataParser,
} from "../../common/input-to-data.parser";

export class EntityFactory {
  static create(
    input: EntityFactoryInput,
    model: Model,
    config: Config,
    dependencies?: Component[]
  ): Entity {
    const { id, name, endpoint, write_method } = input;
    const references = {
      addons: { hasModel: !!model },
      dependencies: dependencies || [],
    };
    const parser = new InputToDataParser(config);
    const data = parser.parse<ClassData>(
      "entity",
      input,
      new DefaultGroups(["common"]),
      references
    );

    const element = ClassSchema.create<EntityElement>(
      new DataProvider(data.element),
      config,
      references
    );

    const component = Component.create<EntityElement, EntityAddons>(config, {
      id: id || nanoid(),
      type: EntityType.create(data.element.name, name),
      endpoint,
      path: data.path,
      writeMethod: write_method,
      addons: references.addons,
      element,
      dependencies: references.dependencies,
      rank: data.element.rank,
    });

    if (model) {
      component.addDependency(model, config);
    }

    return component;
  }
}
