import chalk from "chalk";
import {
  ApiSchema,
  Component,
  ComponentRegistry,
  Config,
  EntityJson,
  Model,
  Texts,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import { ModelFactory } from "../new-model";
import { TestSuiteFactory } from "../new-test-suite";
import { EntityFactory } from "./entity.factory";
import {
  CommandConfig,
  DependencyResolver,
  WriteMethodsAssignment,
} from "../../../../core";

export class EntityJsonParser {
  constructor(
    private config: Config,
    private command: CommandConfig,
    private writeMethods: WriteMethodsAssignment,
    private texts: Texts,
    private apiSchema: ApiSchema
  ) {}

  private ensureModel(data: EntityJson, registry: ComponentRegistry): Model {
    const { name, endpoint, props } = data;
    const { config, apiSchema, writeMethods } = this;
    let model = apiSchema.get({ component: "model", name, type: "json" });

    if (!model) {
      model = ModelFactory.create(
        {
          name,
          endpoint,
          type: "json",
          props,
          write_method: writeMethods.relatedComponentsMethods.model,
          rank: 2,
        },
        config
      );
      registry.add(model);
    }

    return model;
  }

  parse(list: EntityJson[]): {
    components: Component[];
  } {
    const { config, texts, command, apiSchema, writeMethods } = this;
    const registry = new ComponentRegistry();

    for (const data of list) {
      const { name, endpoint } = data;
      const rank = data.rank || 0;
      const write_method = data.write_method || command.write_method;

      if (!endpoint && config.presets.entity.isEndpointRequired()) {
        console.log(chalk.red(texts.get("missing_endpoint")));
        console.log(
          chalk.yellow(texts.get("component_###_skipped").replace("###", name))
        );
        continue;
      }

      if (registry.entities.find((e) => e.type.ref === name)) {
        continue;
      }
      const model = data.has_model ? this.ensureModel(data, registry) : null;
      const entity = EntityFactory.create(
        { ...data, write_method, rank },
        model,
        config,
        []
      );

      if (!command.no_tests && entity.element.methods.length > 0) {
        const suite = TestSuiteFactory.create(
          { name, endpoint, type: "unit_tests" },
          entity,
          write_method,
          config
        );
        registry.add(suite);
      }

      const resolved = DependencyResolver.resolveMissingDependencies(
        entity,
        config,
        writeMethods.relatedComponentsMethods,
        apiSchema
      );

      registry.add(entity, ...resolved.entities, ...resolved.models);
    }

    return { components: registry.toArray() };
  }
}
