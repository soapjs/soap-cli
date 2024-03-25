import { paramCase } from "change-case";
import {
  ApiSchema,
  Collection,
  Component,
  Config,
  DataContextJson,
  Entity,
  Mapper,
  Model,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import { CollectionFactory } from "../../new-collection";
import { MapperFactory } from "../../new-mapper";
import { ModelFactory } from "../../new-model";

export class DataContextJsonParser {
  constructor(
    private config: Config,
    private writeMethod: { component: WriteMethod; dependency: WriteMethod },
    private apiSchema: ApiSchema
  ) {}

  parse(
    list: (string | DataContextJson)[],
    name: string,
    endpoint: string,
    entity: Entity
  ) {
    const { config, writeMethod, apiSchema } = this;
    const contexts: { model: Model; collection: Collection; mapper: Mapper }[] =
      [];
    const dependencies: Component[] = [];

    for (const context of list) {
      let type;
      let collection;
      let collectionName;
      let mapper;
      let mapperName;
      let model;
      let modelName;
      let table;
      let isCustomCollection = false;

      if (typeof context === "string") {
        type = context;
        collectionName = name;
        mapperName = name;
        modelName = name;
        table = paramCase(`${name}.collection`);
      } else {
        type = context.type;
        collectionName = context.collection.name || name;
        mapperName = context.mapper || name;
        modelName = context.model || name;
        isCustomCollection = context.collection.impl;
        table = context.collection.table;
      }

      model = apiSchema.get({ component: "model", ref: modelName });

      if (!model) {
        model = ModelFactory.create(
          {
            name: modelName,
            endpoint,
            type,
            write_method: writeMethod.dependency,
          },
          config
        );
        dependencies.push(model);
      }

      collection = apiSchema.get({
        component: "collection",
        ref: collectionName,
      });

      if (!collection) {
        collection = CollectionFactory.create(
          {
            name: collectionName,
            endpoint,
            type: type,
            table,
            is_custom: isCustomCollection,
            write_method: writeMethod.dependency,
          },
          model,
          config
        );
        dependencies.push(collection);
      }

      mapper = apiSchema.get({ component: "mapper", ref: mapperName });
      if (!mapper) {
        mapper = MapperFactory.create(
          {
            name: mapperName,
            endpoint,
            type,
            write_method: writeMethod.dependency,
          },
          entity,
          model,
          config
        );
        dependencies.push(mapper);
      }

      contexts.push({ model, mapper, collection });
    }

    return { dependencies, contexts };
  }
}
