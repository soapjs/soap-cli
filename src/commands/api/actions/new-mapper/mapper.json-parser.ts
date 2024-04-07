import {
  ApiSchema,
  Component,
  ComponentRegistry,
  Config,
  Entity,
  MapperJson,
  Model,
  Texts,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import chalk from "chalk";
import { EntityFactory } from "../new-entity";
import { ModelFactory } from "../new-model";
import { TestSuiteFactory } from "../new-test-suite";
import { MapperFactory } from "./mapper.factory";
import {
  CommandConfig,
  DependencyResolver,
  WriteMethodsAssignment,
} from "../../../../core";
import { pascalCase } from "change-case";

export class MapperJsonParser {
  constructor(
    private config: Config,
    private command: CommandConfig,
    private writeMethods: WriteMethodsAssignment,
    private texts: Texts,
    private apiSchema: ApiSchema
  ) {}

  private ensureEntity(data, registry): Entity {
    const { config, apiSchema, writeMethods } = this;
    const { name, endpoint } = data;
    const entityName = data.entity || name;
    let entity = apiSchema.get({ component: "entity", ref: entityName });

    if (!entity) {
      entity = EntityFactory.create(
        {
          name: entityName,
          endpoint,
          write_method: writeMethods.relatedComponentsMethods.entity,
          rank: 2,
        },
        null,
        config,
        []
      );
      registry.add(entity);
    }

    return entity;
  }
  private ensureModel(data, type, registry): Model {
    const { config, apiSchema, writeMethods } = this;
    const { name, endpoint } = data;
    const modelName = data.model || name;

    let model = apiSchema.get({
      component: "model",
      ref: modelName,
      type,
    });

    if (!model) {
      model = ModelFactory.create(
        {
          name: modelName,
          endpoint,
          type,
          write_method: writeMethods.relatedComponentsMethods.model,
          rank: 2,
        },
        config,
        []
      );
      registry.add(model);
    }

    return model;
  }

  parse(list: MapperJson[]): {
    components: Component[];
  } {
    const { config, texts, command, apiSchema, writeMethods } = this;
    const registry = new ComponentRegistry();

    for (const data of list) {
      const { name, endpoint, types, props, methods } = data;
      const write_method = data.write_method || command.write_method;
      const rank = data.rank || 0;

      if (!endpoint && config.presets.mapper.isEndpointRequired()) {
        console.log(chalk.red(texts.get("missing_endpoint")));
        console.log(
          chalk.yellow(texts.get("component_###_skipped").replace("###", name))
        );
        continue;
      }

      const entity = this.ensureEntity(data, registry);

      for (const type of types) {
        if (
          registry.mappers.find(
            (m) => m.type.ref === data.name && m.type.type === type
          )
        ) {
          continue;
        }

        const model = this.ensureModel(data, type, registry);
        const mapper = MapperFactory.create(
          {
            name,
            type,
            endpoint,
            props,
            methods,
            write_method,
            rank,
          },
          entity,
          model,
          config
        );

        if (!command.no_tests && mapper.element.methods.length > 0) {
          //
          const suite = TestSuiteFactory.create(
            {
              name: pascalCase(`${name} ${type}`),
              endpoint,
              type: "unit_tests",
            },
            mapper,
            write_method,
            config
          );

          registry.add(suite);
        }

        const missingDependnecies =
          DependencyResolver.resolveMissingDependencies(
            mapper,
            config,
            writeMethods.relatedComponentsMethods,
            apiSchema
          );

        registry.add(
          mapper,
          ...missingDependnecies.models,
          ...missingDependnecies.entities
        );
      }
    }

    return { components: registry.toArray() };
  }
}
