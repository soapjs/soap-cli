import { nanoid } from "nanoid";
import {
  Component,
  Config,
  DataProvider,
  DatabaseType,
  Model,
  ModelAddons,
  ModelElement,
  ModelType,
  TypeData,
  TypeSchema,
} from "@soapjs/soap-cli-common";
import { ModelFactoryInput } from "./types";
import {
  DefaultGroups,
  InputToDataParser,
} from "../../common/input-to-data.parser";

export class ModelFactory {
  static create(
    input: ModelFactoryInput,
    config: Config,
    dependencies?: Component[]
  ): Model {
    const _dependencies = dependencies || [];
    const { id, type, endpoint, write_method } = input;
    const addons = { modelType: type };
    const dbConfig = config.databases.find((d) => d.alias === type);

    const parser = new InputToDataParser(config);
    const data = parser.parse<TypeData>(
      "model",
      input,
      new DefaultGroups(["common", type]),
      {
        addons,
        dependencies: _dependencies,
      }
    );

    if (dbConfig) {
      data.element.props.forEach((p) => {
        const mapping = dbConfig.mappings.find(
          (m) => m.codeType === p.type.ref
        );
        if (mapping) {
          p.type = DatabaseType.create(mapping.dbType);
        }
      });
    }

    const element = TypeSchema.create<ModelElement>(
      new DataProvider(data.element),
      config,
      {
        addons,
        dependencies: _dependencies,
      }
    );

    const component = Component.create<ModelElement, ModelAddons>(config, {
      id: id || nanoid(),
      type: ModelType.create(data.element.name, input.name, type),
      endpoint,
      path: data.path,
      writeMethod: write_method,
      addons,
      element,
      dependencies: _dependencies,
    });

    return component;
  }
}
