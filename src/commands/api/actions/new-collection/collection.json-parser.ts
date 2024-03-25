import {
  Texts,
  Entity,
  WriteMethod,
  CollectionJson,
  Model,
  Config,
  Collection,
  TestSuite,
  ApiSchema,
  ComponentRegistry,
  Component,
} from "@soapjs/soap-cli-common";
import chalk from "chalk";
import { ModelFactory } from "../new-model";
import { TestSuiteFactory } from "../new-test-suite";
import { CollectionFactory } from "./collection.factory";
import { CommandConfig, DependencyTools } from "../../../../core";
import { pascalCase } from "change-case";

export class CollectionJsonParser {
  constructor(
    private config: Config,
    private command: CommandConfig,
    private texts: Texts,
    private writeMethod: { component: WriteMethod; dependency: WriteMethod },
    private apiSchema: ApiSchema
  ) {}

  parse(
    list: CollectionJson[],
    writeMethod?: WriteMethod
  ): {
    components: Component[];
  } {
    const { config, texts, command, apiSchema } = this;
    const registry = new ComponentRegistry();

    for (const data of list) {
      const { name, endpoint, types, table, props, methods } = data;

      if (!endpoint && config.presets.collection.isEndpointRequired()) {
        console.log(chalk.red(texts.get("missing_endpoint")));
        console.log(
          chalk.yellow(texts.get("component_###_skipped").replace("###", name))
        );
        continue;
      }

      for (const type of types) {
        let model;
        if (
          registry.collections.find(
            (m) => m.type.ref === name && m.type.type === type
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
              write_method: writeMethod || this.writeMethod.dependency,
            },
            config
          );
          registry.add(model);
        }

        const collection = CollectionFactory.create(
          {
            name,
            type,
            table,
            endpoint,
            props,
            methods,
            write_method: writeMethod || this.writeMethod.component,
          },
          model,
          config
        );

        if (!command.skip_tests && collection.element.methods.length > 0) {
          //
          const suite = TestSuiteFactory.create(
            {
              name: pascalCase(`${name} ${type}`),
              endpoint,
              type: "unit_tests",
            },
            collection,
            this.writeMethod.component,
            config
          );

          registry.add(suite);
        }

        const resolved = DependencyTools.resolveMissingDependnecies(
          collection,
          config,
          this.writeMethod.dependency,
          apiSchema
        );

        registry.add(collection, ...resolved.models, ...resolved.entities);
      }
    }

    return { components: registry.toArray() };
  }
}
