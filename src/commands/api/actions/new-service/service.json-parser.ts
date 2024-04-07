import chalk from "chalk";
import {
  ApiSchema,
  Component,
  ComponentRegistry,
  Config,
  ServiceImpl,
  ServiceJson,
  Texts,
} from "@soapjs/soap-cli-common";
import { TestSuiteFactory } from "../new-test-suite";
import { ServiceFactory } from "./factories/service.factory";
import {
  CommandConfig,
  DependencyResolver,
  WriteMethodsAssignment,
} from "../../../../core";
import { ServiceImplFactory } from "./factories/service-impl.factory";
import { ServiceIocContext } from "./types";

export class ServiceJsonParser {
  constructor(
    private config: Config,
    private command: CommandConfig,
    private writeMethods: WriteMethodsAssignment,
    private texts: Texts,
    private apiSchema: ApiSchema
  ) {}

  buildTestSuite(data: ServiceJson, service: ServiceImpl) {
    const { config, command } = this;
    const { name, endpoint } = data;
    const suite = TestSuiteFactory.create(
      { name, endpoint, type: "unit_tests" },
      service,
      command.write_method,
      config
    );

    return suite;
  }

  parse(list: ServiceJson[]): {
    components: Component[];
    ioc_contexts: ServiceIocContext[];
  } {
    const { config, texts, command, apiSchema, writeMethods } = this;
    const ioc_contexts: ServiceIocContext[] = [];
    const registry = new ComponentRegistry();

    for (const data of list) {
      const { name, endpoint } = data;
      const write_method = data.write_method || command.write_method;
      const rank = data.rank || 0;

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
        { ...data, write_method, rank },

        config,
        []
      );

      const serviceImpl = ServiceImplFactory.create(
        { ...data, write_method, rank },
        service,
        config
      );
      registry.add(serviceImpl);

      if (!command.no_tests) {
        const suite = this.buildTestSuite(data, serviceImpl);
        registry.add(suite);
      }

      const missingDependencies = DependencyResolver.resolveMissingDependencies(
        service,
        config,
        writeMethods.relatedComponentsMethods,
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
