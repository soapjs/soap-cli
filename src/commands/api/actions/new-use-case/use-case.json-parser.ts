import chalk from "chalk";
import { Config, TypeInfo, TestCaseSchema } from "../../../../core";
import { Entity, EntityFactory } from "../new-entity";
import { Model, ModelFactory } from "../new-model";
import { UseCaseJson, UseCase } from "./types";
import { UseCaseFactory } from "./use-case.factory";
import { TestSuite, TestSuiteFactory } from "../new-test-suite";
import { Texts, WriteMethod } from "@soapjs/soap-cli-common";

export class UseCaseJsonParse {
  constructor(
    private config: Config,

    private texts: Texts,
    private writeMethod: { component: WriteMethod; dependency: WriteMethod }
  ) {}

  buildInput(data: UseCaseJson) {
    return [];
  }

  buildOutput(data: UseCaseJson, modelsRef: Model[], entitiesRef: Entity[]) {
    const { config, writeMethod } = this;
    const { endpoint } = data;
    const outputType = TypeInfo.create(data.output, config);

    if (outputType.isModel) {
      const m = modelsRef.find((m) => m.type.ref === outputType.ref);

      if (m) {
        return m;
      }

      return ModelFactory.create(
        {
          name: outputType.ref,
          type: outputType.type,
          endpoint,
        },
        writeMethod.dependency,
        config,
        []
      );
    }

    if (outputType.isEntity) {
      const e = entitiesRef.find((e) => e.type.ref === outputType.ref);

      if (e) {
        return e;
      }

      return EntityFactory.create(
        {
          name: outputType.ref,
          endpoint,
        },
        null,
        writeMethod.dependency,
        config,
        []
      );
    }
  }

  build(
    list: UseCaseJson[],
    modelsRef: Model[],
    entitiesRef: Entity[]
  ): {
    use_cases: UseCase[];
    models: Model[];
    entities: Entity[];
    test_suites: TestSuite[];
  } {
    const { config, texts, writeMethod } = this;
    const use_cases: UseCase[] = [];
    const models: Model[] = [];
    const entities: Entity[] = [];
    const test_suites: TestSuite[] = [];

    for (const data of list) {
      const { name, endpoint } = data;

      if (!endpoint && config.components.collection.isEndpointRequired()) {
        console.log(chalk.red(texts.get("missing_endpoint")));
        console.log(
          chalk.yellow(texts.get("component_###_skipped").replace("###", name))
        );
        continue;
      }

      const input = this.buildInput(data);
      const output = this.buildOutput(data, modelsRef, entitiesRef);
      const useCase = UseCaseFactory.create(
        data,
        output,
        writeMethod.component,
        config
      );

      if (!config.command.skip_tests && useCase.element.methods.length > 0) {
        //
        const suite = TestSuiteFactory.create(
          { name, endpoint, type: "unit_tests" },
          useCase,
          writeMethod.component,
          config
        );

        useCase.element.methods.forEach((method) => {
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

      useCase.unresolvedDependencies.forEach((type) => {
        // MODEL DEPENDENCY
        if (type.isModel) {
          let model;
          model = modelsRef.find(
            (m) => m.type.ref === type.ref && m.type.type === type.type
          );

          if (!model) {
            model = ModelFactory.create(
              { name: type.ref, endpoint: useCase.endpoint, type: type.type },
              writeMethod.dependency,
              config,
              []
            );
            models.push(model);
          }
          useCase.addDependency(model, config);
        } else if (type.isEntity) {
          let entity;
          entity = entitiesRef.find((m) => m.type.ref === type.ref);
          if (!entity) {
            entity = EntityFactory.create(
              { name: type.ref, endpoint: useCase.endpoint },
              null,
              writeMethod.dependency,
              config,
              []
            );
            entities.push(entity);
          }
          useCase.addDependency(entity, config);
        }
      });

      use_cases.push(useCase);
    }

    return { use_cases, models, entities, test_suites };
  }
}
