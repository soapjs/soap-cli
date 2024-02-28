import chalk from "chalk";
import {
  Config,
  Entity,
  EntityJson,
  Model,
  TestCaseSchema,
  TestSuite,
  Texts,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import { ModelFactory } from "../new-model";
import { TestSuiteFactory } from "../new-test-suite";
import { EntityFactory } from "./entity.factory";
import { CommandConfig } from "../../../../core";

export class EntityJsonParser {
  constructor(
    private config: Config,
    private command: CommandConfig,
    private texts: Texts,
    private writeMethod: { component: WriteMethod; dependency: WriteMethod }
  ) {}

  build(
    list: EntityJson[],
    modelsRef: Model[]
  ): { models: Model[]; entities: Entity[]; test_suites: TestSuite[] } {
    const { config, texts, writeMethod, command } = this;
    const models: Model[] = [];
    const entities: Entity[] = [];
    const test_suites: TestSuite[] = [];

    for (const data of list) {
      const { name, endpoint, has_model, props } = data;
      let model;

      if (!endpoint && config.components.entity.isEndpointRequired()) {
        console.log(chalk.red(texts.get("missing_endpoint")));
        console.log(
          chalk.yellow(texts.get("component_###_skipped").replace("###", name))
        );
        continue;
      }

      if (entities.find((e) => e.type.ref === name)) {
        continue;
      }

      if (
        has_model &&
        modelsRef.findIndex(
          (m) => m.type.ref === name && m.type.type === "json"
        ) === -1
      ) {
        model = ModelFactory.create(
          { name, endpoint, type: "json", props },
          writeMethod.dependency,
          config,
          []
        );

        models.push(model);
      }

      const entity = EntityFactory.create(
        data,
        model,
        writeMethod.component,
        config,
        []
      );

      if (!command.skip_tests && entity.element.methods.length > 0) {
        //
        const suite = TestSuiteFactory.create(
          { name, endpoint, type: "unit_tests" },
          entity,
          writeMethod.component,
          config
        );

        entity.element.methods.forEach((method) => {
          suite.element.addTest(
            TestCaseSchema.create({
              group: { name: suite.element.name, is_async: false },
              is_async: method.isAsync,
              name: method.name,
              methods: [method],
            })
          );
        });
        test_suites.push(suite);
      }

      entities.push(entity);
    }

    entities.forEach((entity) => {
      entity.unresolvedDependencies.forEach((type) => {
        // MODEL DEPENDENCY
        if (type.isModel) {
          let model;
          model = modelsRef.find(
            (m) => m.type.ref === type.ref && m.type.type === type.type
          );

          if (!model) {
            model = ModelFactory.create(
              { name: type.ref, endpoint: entity.endpoint, type: type.type },
              writeMethod.dependency,
              config,
              []
            );
            models.push(model);
          }
          entity.addDependency(model, config);
        } else if (type.isEntity) {
          let e;
          e = entities.find((m) => m.type.ref === type.ref);
          if (!e) {
            e = EntityFactory.create(
              { name: type.ref, endpoint: entity.endpoint },
              null,
              writeMethod.dependency,
              config,
              []
            );
            entities.push(e);
          }
          entity.addDependency(e, config);
        }
      });
    });

    return { entities, models, test_suites };
  }
}
