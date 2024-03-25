import {
  ApiSchema,
  Component,
  ComponentRegistry,
  Config,
  Entity,
  Mapper,
  MapperJson,
  Model,
  TestSuite,
  Texts,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import chalk from "chalk";
import { EntityFactory } from "../new-entity";
import { ModelFactory } from "../new-model";
import { TestSuiteFactory } from "../new-test-suite";
import { MapperFactory } from "./mapper.factory";
import { CommandConfig, DependencyTools } from "../../../../core";
import { pascalCase } from "change-case";

export class MapperJsonParser {
  constructor(
    private config: Config,
    private command: CommandConfig,
    private texts: Texts,
    private writeMethod: { component: WriteMethod; dependency: WriteMethod },
    private apiSchema: ApiSchema
  ) {}

  parse(
    list: MapperJson[],
    writeMethod?: WriteMethod
  ): {
    components: Component[];
  } {
    const { config, texts, command, apiSchema } = this;
    const registry = new ComponentRegistry();

    for (const data of list) {
      let entity;
      const { name, endpoint, types, props, methods } = data;

      if (!endpoint && config.presets.mapper.isEndpointRequired()) {
        console.log(chalk.red(texts.get("missing_endpoint")));
        console.log(
          chalk.yellow(texts.get("component_###_skipped").replace("###", name))
        );
        continue;
      }
      const entityName = data.entity || name;
      entity = apiSchema.get({ component: "entity", ref: entityName });

      if (!entity) {
        entity = EntityFactory.create(
          {
            name: entityName,
            endpoint,
            write_method: this.writeMethod.dependency,
          },
          null,
          config,
          []
        );
        registry.add(entity);
      }

      for (const type of types) {
        let model;
        if (
          registry.mappers.find(
            (m) => m.type.ref === data.name && m.type.type === type
          )
        ) {
          continue;
        }

        model = apiSchema.get({
          component: "model",
          ref: data.model || name,
          type,
        });

        if (!model) {
          model = ModelFactory.create(
            {
              name: data.model || name,
              endpoint,
              type,
              write_method: this.writeMethod.dependency,
            },
            config,
            []
          );
          registry.add(model);
        }

        const mapper = MapperFactory.create(
          {
            name,
            type,
            endpoint,
            props,
            methods,
            write_method: writeMethod || this.writeMethod.component,
          },
          entity,
          model,
          config
        );

        if (!command.skip_tests && mapper.element.methods.length > 0) {
          //
          const suite = TestSuiteFactory.create(
            {
              name: pascalCase(`${name} ${type}`),
              endpoint,
              type: "unit_tests",
            },
            mapper,
            this.writeMethod.component,
            config
          );

          registry.add(suite);
        }

        const missingDependnecies = DependencyTools.resolveMissingDependnecies(
          mapper,
          config,
          this.writeMethod.dependency,
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
