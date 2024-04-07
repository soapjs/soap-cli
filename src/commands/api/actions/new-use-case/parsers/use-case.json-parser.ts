import chalk from "chalk";
import {
  ApiSchema,
  Component,
  ComponentRegistry,
  Config,
  Texts,
  UseCaseJson,
} from "@soapjs/soap-cli-common";
import { TestSuiteFactory } from "../../new-test-suite";
import { UseCaseFactory } from "../use-case.factory";
import {
  CommandConfig,
  DependencyResolver,
  WriteMethodsAssignment,
} from "../../../../../core";

export class UseCaseJsonParse {
  constructor(
    private config: Config,
    private command: CommandConfig,
    private writeMethods: WriteMethodsAssignment,
    private texts: Texts,
    private apiSchema: ApiSchema
  ) {}

  parse(list: UseCaseJson[]): {
    components: Component[];
  } {
    const { config, texts, command, apiSchema, writeMethods } = this;
    const registry = new ComponentRegistry();

    for (const data of list) {
      const { name, endpoint } = data;
      const write_method = data.write_method || command.write_method;
      const rank = data.rank || 0;

      if (!endpoint && config.presets.collection.isEndpointRequired()) {
        console.log(chalk.red(texts.get("missing_endpoint")));
        console.log(
          chalk.yellow(texts.get("component_###_skipped").replace("###", name))
        );
        continue;
      }

      const useCase = UseCaseFactory.create(
        { ...data, write_method, rank },
        config
      );

      if (!command.no_tests && useCase.element.methods.length > 0) {
        //
        const suite = TestSuiteFactory.create(
          { name, endpoint, type: "unit_tests" },
          useCase,
          command.write_method,
          config
        );

        registry.add(suite);
      }

      const resolved = DependencyResolver.resolveMissingDependencies(
        useCase,
        config,
        writeMethods.relatedComponentsMethods,
        apiSchema
      );

      registry.add(useCase, ...resolved.models, ...resolved.entities);
    }

    return { components: registry.toArray() };
  }
}
