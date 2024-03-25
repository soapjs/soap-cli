import chalk from "chalk";
import {
  ApiSchema,
  Component,
  ComponentRegistry,
  Config,
  Entity,
  Model,
  TestSuite,
  Texts,
  UseCase,
  UseCaseJson,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import { TestSuiteFactory } from "../../new-test-suite";
import { UseCaseFactory } from "../use-case.factory";
import { CommandConfig, DependencyTools } from "../../../../../core";

export class UseCaseJsonParse {
  constructor(
    private config: Config,
    private command: CommandConfig,
    private texts: Texts,
    private writeMethod: { component: WriteMethod; dependency: WriteMethod },
    private apiSchema: ApiSchema
  ) {}

  parse(
    list: UseCaseJson[],
    writeMethod?: WriteMethod
  ): {
    components: Component[];
  } {
    const { config, texts, command, apiSchema } = this;
    const registry = new ComponentRegistry();

    for (const data of list) {
      const { name, endpoint } = data;

      if (!endpoint && config.presets.collection.isEndpointRequired()) {
        console.log(chalk.red(texts.get("missing_endpoint")));
        console.log(
          chalk.yellow(texts.get("component_###_skipped").replace("###", name))
        );
        continue;
      }

      const useCase = UseCaseFactory.create(
        { ...data, write_method: writeMethod || this.writeMethod.component },
        config
      );

      if (!command.skip_tests && useCase.element.methods.length > 0) {
        //
        const suite = TestSuiteFactory.create(
          { name, endpoint, type: "unit_tests" },
          useCase,
          this.writeMethod.component,
          config
        );

        registry.add(suite);
      }

      const resolved = DependencyTools.resolveMissingDependnecies(
        useCase,
        config,
        this.writeMethod.dependency,
        apiSchema
      );

      registry.add(useCase, ...resolved.models, ...resolved.entities);
    }

    return { components: registry.toArray() };
  }
}
