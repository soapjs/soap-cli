import chalk from "chalk";
import {
  ApiSchema,
  Component,
  ComponentRegistry,
  Config,
  EntityJson,
  Texts,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import { ModelFactory } from "../new-model";
import { TestSuiteFactory } from "../new-test-suite";
import { EntityFactory } from "./entity.factory";
import { CommandConfig, DependencyTools } from "../../../../core";

export class EntityJsonParser {
  constructor(
    private config: Config,
    private command: CommandConfig,
    private texts: Texts,
    private writeMethod: { component: WriteMethod; dependency: WriteMethod },
    private apiSchema: ApiSchema
  ) {}

  parse(
    list: EntityJson[],
    writeMethod?: WriteMethod
  ): {
    components: Component[];
  } {
    const { config, texts, command, apiSchema } = this;
    const registry = new ComponentRegistry();

    for (const data of list) {
      const { name, endpoint, has_model, props } = data;
      let model;

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
      model = apiSchema.get({ component: "model", name, type: "json" });

      if (has_model && !model) {
        model = ModelFactory.create(
          {
            name,
            endpoint,
            type: "json",
            props,
            write_method: this.writeMethod.dependency,
          },
          config
        );

        registry.add(model);
      }

      const entity = EntityFactory.create(
        { ...data, write_method: writeMethod || this.writeMethod.component },
        model,
        config,
        []
      );

      if (!command.skip_tests && entity.element.methods.length > 0) {
        const suite = TestSuiteFactory.create(
          { name, endpoint, type: "unit_tests" },
          entity,
          this.writeMethod.component,
          config
        );
        registry.add(suite);
      }

      const resolved = DependencyTools.resolveMissingDependnecies(
        entity,
        config,
        this.writeMethod.dependency,
        apiSchema
      );

      registry.add(entity, ...resolved.entities, ...resolved.models);
    }

    return { components: registry.toArray() };
  }
}
