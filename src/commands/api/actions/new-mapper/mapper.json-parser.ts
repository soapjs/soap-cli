import {
  Config,
  Entity,
  Mapper,
  MapperJson,
  MethodTools,
  Model,
  PropTools,
  TestCaseSchema,
  TestSuite,
  Texts,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import chalk from "chalk";
import { EntityFactory } from "../new-entity";
import { ModelFactory } from "../new-model";
import { TestSuiteFactory } from "../new-test-suite";
import { MapperFactory } from "./mapper.factory";
import { CommandConfig, DependenciesTools } from "../../../../core";
import { pascalCase } from "change-case";

export class MapperJsonParser {
  constructor(
    private config: Config,
    private command: CommandConfig,
    private texts: Texts,
    private writeMethod: { component: WriteMethod; dependency: WriteMethod }
  ) {}

  build(
    list: MapperJson[],
    entitiesRef: Entity[],
    modelsRef: Model[]
  ): {
    mappers: Mapper[];
    models: Model[];
    entities: Entity[];
    test_suites: TestSuite[];
  } {
    const { config, texts, writeMethod, command } = this;
    const mappers: Mapper[] = [];
    const models: Model[] = [];
    const entities: Entity[] = [];
    const test_suites: TestSuite[] = [];

    for (const data of list) {
      let entity;
      const { name, endpoint, storages, props, methods } = data;

      if (!endpoint && config.components.mapper.isEndpointRequired()) {
        console.log(chalk.red(texts.get("missing_endpoint")));
        console.log(
          chalk.yellow(texts.get("component_###_skipped").replace("###", name))
        );
        continue;
      }

      entity = entitiesRef.find(
        (e) => e.type.ref === data.entity || e.type.ref === name
      );

      if (!entity) {
        entity = EntityFactory.create(
          {
            name: data.entity || name,
            endpoint,
          },
          null,
          writeMethod.dependency,
          config,
          []
        );
        entities.push(entity);
      }

      for (const storage of storages) {
        let model;
        if (
          mappers.find(
            (m) => m.type.ref === data.name && m.type.type === storage
          )
        ) {
          continue;
        }

        model = modelsRef.find(
          (m) =>
            (m.type.ref === data.model || m.type.ref === name) &&
            m.type.type === storage
        );

        if (!model) {
          model = ModelFactory.create(
            {
              name: data.model || name,
              endpoint,
              type: storage,
            },
            writeMethod.dependency,
            config,
            []
          );
          models.push(model);
        }

        const mapper = MapperFactory.create(
          {
            name,
            storage,
            endpoint,
            props: PropTools.arrayToData(props, config, {
              dependencies: [],
              addons: {},
            }),
            methods: MethodTools.arrayToData(methods, config, {
              dependencies: [],
              addons: {},
            }),
          },
          entity,
          model,
          writeMethod.component,
          config
        );

        if (!command.skip_tests && mapper.element.methods.length > 0) {
          //
          const suite = TestSuiteFactory.create(
            {
              name: pascalCase(`${name} ${storage}`),
              endpoint,
              type: "unit_tests",
            },
            mapper,
            writeMethod.component,
            config
          );

          mapper.element.methods.forEach((method) => {
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

        const missingDependnecies =
          DependenciesTools.resolveMissingDependnecies(
            mapper,
            config,
            writeMethod.dependency,
            [...models, ...modelsRef],
            [...entities, ...entitiesRef]
          );
        models.push(...missingDependnecies.models);
        entities.push(...missingDependnecies.entities);

        mappers.push(mapper);
      }
    }

    return { mappers, models, entities, test_suites };
  }
}
