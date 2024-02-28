import {
  Texts,
  Entity,
  WriteMethod,
  CollectionJson,
  Model,
  Config,
  Collection,
  TestSuite,
  PropTools,
  MethodTools,
  TestCaseSchema,
} from "@soapjs/soap-cli-common";
import chalk from "chalk";
import { EntityFactory } from "../new-entity";
import { ModelFactory } from "../new-model";
import { TestSuiteFactory } from "../new-test-suite";
import { CollectionFactory } from "./collection.factory";
import { CommandConfig } from "../../../../core";

export class CollectionJsonParser {
  constructor(
    private config: Config,
    private command: CommandConfig,
    private texts: Texts,
    private writeMethod: { component: WriteMethod; dependency: WriteMethod }
  ) {}

  build(
    list: CollectionJson[],
    modelsRef: Model[]
  ): {
    collections: Collection[];
    models: Model[];
    entities: Entity[];
    test_suites: TestSuite[];
  } {
    const { config, texts, writeMethod, command } = this;
    const collections: Collection[] = [];
    const models: Model[] = [];
    const entities: Entity[] = [];
    const test_suites: TestSuite[] = [];

    for (const data of list) {
      const { name, endpoint, storages, table, props, methods } = data;

      if (!endpoint && config.components.collection.isEndpointRequired()) {
        console.log(chalk.red(texts.get("missing_endpoint")));
        console.log(
          chalk.yellow(texts.get("component_###_skipped").replace("###", name))
        );
        continue;
      }

      for (const storage of storages) {
        let model;
        if (
          collections.find(
            (m) => m.type.ref === name && m.type.type === storage
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

        const collection = CollectionFactory.create(
          {
            name,
            storage,
            table,
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
          model,
          writeMethod.component,
          config
        );

        if (!command.skip_tests && collection.element.methods.length > 0) {
          //
          const suite = TestSuiteFactory.create(
            { name, endpoint, type: "unit_tests" },
            collection,
            writeMethod.component,
            config
          );

          collection.element.methods.forEach((method) => {
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

        collection.unresolvedDependencies.forEach((type) => {
          // MODEL DEPENDENCY
          if (type.isModel) {
            let model;
            model = modelsRef.find(
              (m) => m.type.ref === type.ref && m.type.type === type.type
            );

            if (!model) {
              model = ModelFactory.create(
                {
                  name: type.ref,
                  endpoint: collection.endpoint,
                  type: type.type,
                },
                writeMethod.dependency,
                config,
                []
              );
              models.push(model);
            }
            collection.addDependency(model, config);
          } else if (type.isEntity) {
            let e;
            e = entities.find((m) => m.type.ref === type.ref);
            if (!e) {
              e = EntityFactory.create(
                { name: type.ref, endpoint: collection.endpoint },
                null,
                writeMethod.dependency,
                config,
                []
              );
              entities.push(e);
            }
            collection.addDependency(e, config);
          }
        });

        collections.push(collection);
      }
    }

    return { collections, models, entities, test_suites };
  }
}
