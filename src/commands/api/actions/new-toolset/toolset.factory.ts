import { nanoid } from "nanoid";
import {
  ClassData,
  ClassJson,
  ClassSchema,
  Component,
  Config,
  DataProvider,
  Toolset,
  ToolsetElement,
  ToolsetType,
} from "@soapjs/soap-cli-common";
import { ToolsetFactoryInput } from "./types";
import exp from "constants";
import {
  InputToDataParser,
  DefaultGroups,
} from "../../common/input-to-data.parser";

export class ToolsetFactory {
  static create(
    input: ToolsetFactoryInput,
    config: Config,
    dependencies: Component[]
  ): Toolset {
    const { id, name, endpoint, write_method } = input;
    const references = {
      addons: {},
      dependencies: dependencies || [],
    };
    const parser = new InputToDataParser(config);
    const data = parser.parse<ClassData>(
      "toolset",
      input,
      new DefaultGroups(["common"]),
      references
    );

    const element = ClassSchema.create<ToolsetElement>(
      new DataProvider(data.element),
      config,
      references
    );

    const component = Component.create<ToolsetElement>(config, {
      id: id || nanoid(),
      type: ToolsetType.create(data.element.name, name),
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
