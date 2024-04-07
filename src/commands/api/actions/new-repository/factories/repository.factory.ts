import {
  ClassData,
  ClassSchema,
  Component,
  Config,
  DataProvider,
  RepositoryElement,
  RepositoryType,
} from "@soapjs/soap-cli-common";
import { RepositoryFactoryInput } from "../types";
import {
  DefaultGroups,
  InputToDataParser,
} from "../../../common/input-to-data.parser";

export class RepositoryFactory {
  static create(
    input: RepositoryFactoryInput,
    config: Config,
    dependencies: Component[]
  ): Component<RepositoryElement> {
    const { id, name, endpoint, write_method } = input;
    const references = {
      addons: {},
      dependencies: dependencies || [],
    };
    const parser = new InputToDataParser(config);
    const data = parser.parse<ClassData>(
      "repository",
      input,
      new DefaultGroups(["common"]),
      references
    );
    const element = ClassSchema.create<RepositoryElement>(
      new DataProvider(data.element),
      config,
      references
    );

    const component = Component.create<RepositoryElement>(config, {
      id,
      type: RepositoryType.create(data.element.name, name),
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
