import chalk from "chalk";
import {
  Config,
  Entity,
  Model,
  Service,
  ServiceJson,
  TestCaseSchema,
  TestSuite,
  Texts,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import { EntityFactory } from "../new-entity";
import { ModelFactory } from "../new-model";
import { TestSuiteFactory } from "../new-test-suite";
import { ServiceFactory } from "./service.factory";
import { CommandConfig } from "../../../../core";

export class ServiceJsonParser {
  constructor(
    private config: Config,
    private command: CommandConfig,
    private texts: Texts,
    private writeMethod: { component: WriteMethod; dependency: WriteMethod }
  ) {}

  parse(
    list: ServiceJson[],
    modelsRef: Model[],
    entitiesRef: Entity[]
  ): {
    models: Model[];
    entities: Entity[];
    services: Service[];
    test_suites: TestSuite[];
  } {
    const { config, texts, writeMethod, command } = this;
    const models: Model[] = [];
    const entities: Entity[] = [];
    const services: Service[] = [];
    const test_suites: TestSuite[] = [];

    for (const data of list) {
      const { name, endpoint } = data;

      if (!endpoint && config.components.service.isEndpointRequired()) {
        console.log(chalk.red(texts.get("missing_endpoint")));
        console.log(
          chalk.yellow(texts.get("component_###_skipped").replace("###", name))
        );
        continue;
      }

      if (services.find((e) => e.type.ref === name)) {
        continue;
      }

      const service = ServiceFactory.create(
        data,
        writeMethod.component,
        config,
        []
      );

      if (!command.skip_tests && service.element.methods.length > 0) {
        //
        const suite = TestSuiteFactory.create(
          { name, endpoint, type: "unit_tests" },
          service,
          writeMethod.component,
          config
        );

        service.element.methods.forEach((method) => {
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

      services.push(service);
    }

    services.forEach((service) => {
      service.unresolvedDependencies.forEach((type) => {
        // MODEL DEPENDENCY
        if (type.isModel) {
          let model;
          model = modelsRef.find(
            (m) => m.type.ref === type.ref && m.type.type === type.type
          );

          if (!model) {
            model = ModelFactory.create(
              { name: type.ref, endpoint: service.endpoint, type: type.type },
              writeMethod.dependency,
              config,
              []
            );
            models.push(model);
          }
          service.addDependency(model, config);
        } else if (type.isEntity) {
          let e;
          e = entitiesRef.find((m) => m.type.ref === type.ref);
          if (!e) {
            e = EntityFactory.create(
              { name: type.ref, endpoint: service.endpoint },
              null,
              writeMethod.dependency,
              config,
              []
            );
            entities.push(e);
          }
          service.addDependency(e, config);
        }
      });
    });

    return { entities, services, models, test_suites };
  }
}
