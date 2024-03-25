import chalk from "chalk";
import {
  ApiSchema,
  Component,
  ComponentRegistry,
  Config,
  Entity,
  Model,
  Service,
  ServiceImpl,
  ServiceJson,
  TestSuite,
  Texts,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import { TestSuiteFactory } from "../new-test-suite";
import { ServiceFactory } from "./factories/service.factory";
import { CommandConfig, DependencyTools } from "../../../../core";
import { ServiceImplFactory } from "./factories/service-impl.factory";
import { ServiceIocContext } from "./types";

export class ServiceJsonParser {
  constructor(
    private config: Config,
    private command: CommandConfig,
    private texts: Texts,
    private writeMethod: { component: WriteMethod; dependency: WriteMethod },
    private apiSchema: ApiSchema
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

    return suite;
  }

  parse(
    list: ServiceJson[],
    writeMethod?: WriteMethod
  ): {
    components: Component[];
    ioc_contexts: ServiceIocContext[];
  } {
    const { config, texts, command, apiSchema } = this;
    const ioc_contexts: ServiceIocContext[] = [];
    const registry = new ComponentRegistry();

    for (const data of list) {
      const { name, endpoint } = data;

      if (!endpoint && config.presets.service.isEndpointRequired()) {
        console.log(chalk.red(texts.get("missing_endpoint")));
        console.log(
          chalk.yellow(texts.get("component_###_skipped").replace("###", name))
        );
        continue;
      }

      if (registry.services.find((e) => e.type.ref === name)) {
        continue;
      }

      const service = ServiceFactory.create(
        { ...data, write_method: writeMethod || this.writeMethod.component },

        config,
        []
      );

      const serviceImpl = ServiceImplFactory.create(
        { ...data, write_method: writeMethod || this.writeMethod.component },
        service,
        config
      );
      registry.add(serviceImpl);

      if (!command.skip_tests) {
        const suite = this.buildTestSuite(data, serviceImpl);
        registry.add(suite);
      }

      const missingDependencies = DependencyTools.resolveMissingDependnecies(
        service,
        config,
        this.writeMethod.dependency,
        apiSchema
      );

      registry.add(
        service,
        ...missingDependencies.models,
        ...missingDependencies.entities
      );

      ioc_contexts.push({ service, impl: serviceImpl });
    }

    return {
      components: registry.toArray(),
      ioc_contexts,
    };
  }
}
