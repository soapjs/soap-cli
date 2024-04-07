import {
  Texts,
  CollectionJson,
  Config,
  ApiSchema,
  ComponentRegistry,
  Component,
  Model,
} from "@soapjs/soap-cli-common";
import chalk from "chalk";
import { ModelFactory } from "../new-model";
import { TestSuiteFactory } from "../new-test-suite";
import { CollectionFactory } from "./collection.factory";
import {
  CommandConfig,
  DependencyResolver,
  WriteMethodsAssignment,
} from "../../../../core";
import { pascalCase } from "change-case";

export class CollectionJsonParser {
  constructor(
    private config: Config,
    private command: CommandConfig,
    private writeMethods: WriteMethodsAssignment,
    private texts: Texts,
    private apiSchema: ApiSchema
  ) {}

  private ensureModel(data, type, registry, related_write_methods): Model {
    const { config, apiSchema } = this;
    const { name, endpoint } = data;
    let model = apiSchema.get({
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
          write_method: related_write_methods.model,
          rank: 2,
        },
        config
      );
      registry.add(model);
    }

    return model;
  }

  parse(list: CollectionJson[]): {
    components: Component[];
  } {
    const { config, texts, command, apiSchema, writeMethods } = this;
    const registry = new ComponentRegistry();

    for (const data of list) {
      const { name, endpoint, types, table, props, methods } = data;
      const write_method = data.write_method || command.write_method;
      const rank = data.rank || 0;

      if (!endpoint && config.presets.collection.isEndpointRequired()) {
        console.log(chalk.red(texts.get("missing_endpoint")));
        console.log(
          chalk.yellow(texts.get("component_###_skipped").replace("###", name))
        );
        continue;
      }

      for (const type of types) {
        if (
          registry.collections.find(
            (m) => m.type.ref === name && m.type.type === type
          )
        ) {
          continue;
        }

        const model = this.ensureModel(data, type, registry, writeMethods);
        const collection = CollectionFactory.create(
          {
            name,
            type,
            table,
            endpoint,
            props,
            methods,
            write_method,
            rank,
          },
          model,
          config
        );

        if (!command.no_tests && collection.element.methods.length > 0) {
          //
          const suite = TestSuiteFactory.create(
            {
              name: pascalCase(`${name} ${type}`),
              endpoint,
              type: "unit_tests",
            },
            collection,
            write_method,
            config
          );

          registry.add(suite);
        }

        const resolved = DependencyResolver.resolveMissingDependencies(
          collection,
          config,
          writeMethods.relatedComponentsMethods,
          apiSchema
        );

        registry.add(collection, ...resolved.models, ...resolved.entities);
      }
    }

    return { components: registry.toArray() };
  }
}
