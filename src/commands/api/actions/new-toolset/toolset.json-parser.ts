import chalk from "chalk";
import {
  Config,
  Entity,
  Model,
  TestCaseSchema,
  TestSuite,
  Texts,
  Toolset,
  ToolsetJson,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import { EntityFactory } from "../new-entity";
import { ModelFactory } from "../new-model";
import { TestSuiteFactory } from "../new-test-suite";
import { ToolsetFactory } from "./toolset.factory";
import { CommandConfig } from "../../../../core";

export class ToolsetJsonParser {
  constructor(
    private config: Config,
    private command: CommandConfig,
    private texts: Texts,
    private writeMethod: { component: WriteMethod; dependency: WriteMethod }
  ) {}

  parse(
    list: ToolsetJson[],
    modelsRef: Model[],
    entitiesRef: Entity[]
  ): {
    models: Model[];
    entities: Entity[];
    toolsets: Toolset[];
    test_suites: TestSuite[];
  } {
    const { config, texts, writeMethod, command } = this;
    const models: Model[] = [];
    const entities: Entity[] = [];
    const toolsets: Toolset[] = [];
    const test_suites: TestSuite[] = [];

    for (const data of list) {
      const { name, endpoint, layer } = data;

      if (!endpoint && config.components.toolset.isEndpointRequired()) {
        console.log(chalk.red(texts.get("missing_endpoint")));
        console.log(
          chalk.yellow(texts.get("component_###_skipped").replace("###", name))
        );
        continue;
      }

      if (toolsets.find((e) => e.type.ref === name)) {
        continue;
      }

      const toolset = ToolsetFactory.create(
        data,
        writeMethod.component,
        config,
        []
      );

      if (!command.skip_tests && toolset.element.methods.length > 0) {
        //
        const suite = TestSuiteFactory.create(
          { name, endpoint, type: "unit_tests", layer },
          toolset,
          writeMethod.component,
          config
        );

        toolset.element.methods.forEach((method) => {
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

      toolsets.push(toolset);
    }

    toolsets.forEach((toolset) => {
      toolset.unresolvedDependencies.forEach((type) => {
        // MODEL DEPENDENCY
        if (type.isModel) {
          let model;
          model = modelsRef.find(
            (m) => m.type.ref === type.ref && m.type.type === type.type
          );

          if (!model) {
            model = ModelFactory.create(
              { name: type.ref, endpoint: toolset.endpoint, type: type.type },
              writeMethod.dependency,
              config,
              []
            );
            models.push(model);
          }
          toolset.addDependency(model, config);
        } else if (type.isEntity) {
          let e;
          e = entitiesRef.find((m) => m.type.ref === type.ref);
          if (!e) {
            e = EntityFactory.create(
              { name: type.ref, endpoint: toolset.endpoint },
              null,
              writeMethod.dependency,
              config,
              []
            );
            entities.push(e);
          }
          toolset.addDependency(e, config);
        }
      });
    });

    return { entities, toolsets, models, test_suites };
  }
}
