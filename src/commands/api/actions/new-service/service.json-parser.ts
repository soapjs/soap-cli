import chalk from "chalk";
import {
  Config,
  Entity,
  Model,
  Service,
  ServiceImpl,
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
import { CommandConfig, DependenciesTools } from "../../../../core";
import { ServiceImplFactory } from "./service-impl.factory";

export class ServiceJsonParser {
  constructor(
    private config: Config,
    private command: CommandConfig,
    private texts: Texts,
    private writeMethod: { component: WriteMethod; dependency: WriteMethod }
  ) {}

  buildTestSuite(data: ServiceJson, service: ServiceImpl) {
    const { config, writeMethod } = this;
    const { name, endpoint } = data;
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

    return suite;
  }

  parse(
    list: ServiceJson[],
    modelsRef: Model[],
    entitiesRef: Entity[]
  ): {
    models: Model[];
    entities: Entity[];
    services: Service[];
    service_impls: ServiceImpl[];
    test_suites: TestSuite[];
  } {
    const { config, texts, writeMethod, command } = this;
    const models: Model[] = [];
    const entities: Entity[] = [];
    const services: Service[] = [];
    const service_impls: ServiceImpl[] = [];
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

      const serviceImpl = ServiceImplFactory.create(
        data,
        service,
        writeMethod.component,
        config
      );
      service_impls.push(serviceImpl);

      if (!command.skip_tests) {
        const suite = this.buildTestSuite(data, serviceImpl);
        test_suites.push(suite);
      }

      const missingDependencies = DependenciesTools.resolveMissingDependnecies(
        service,
        config,
        writeMethod.dependency,
        modelsRef,
        entitiesRef
      );
      models.push(...missingDependencies.models);
      entities.push(...missingDependencies.entities);

      services.push(service);
    }

    return { entities, services, service_impls, models, test_suites };
  }
}
