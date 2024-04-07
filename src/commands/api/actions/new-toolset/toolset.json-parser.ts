import chalk from "chalk";
import {
  ApiSchema,
  Component,
  ComponentRegistry,
  Config,
  Texts,
  ToolsetJson,
} from "@soapjs/soap-cli-common";
import { TestSuiteFactory } from "../new-test-suite";
import { ToolsetFactory } from "./toolset.factory";
import {
  CommandConfig,
  DependencyResolver,
  WriteMethodsAssignment,
} from "../../../../core";

export class ToolsetJsonParser {
  constructor(
    private config: Config,
    private command: CommandConfig,
    private writeMethods: WriteMethodsAssignment,
    private texts: Texts,
    private apiSchema: ApiSchema
  ) {}

  parse(list: ToolsetJson[]): {
    components: Component[];
  } {
    const { config, texts, command, apiSchema, writeMethods } = this;
    const registry = new ComponentRegistry();

    for (const data of list) {
      const { name, endpoint, layer } = data;
      const write_method = data.write_method || command.write_method;
      const rank = data.rank || 0;

      if (!endpoint && config.presets.toolset.isEndpointRequired()) {
        console.log(chalk.red(texts.get("missing_endpoint")));
        console.log(
          chalk.yellow(texts.get("component_###_skipped").replace("###", name))
        );
        continue;
      }

      if (registry.toolsets.find((e) => e.type.ref === name)) {
        continue;
      }

      const toolset = ToolsetFactory.create(
        { ...data, write_method, rank },
        config,
        []
      );

      if (!command.no_tests && toolset.element.methods.length > 0) {
        //
        const suite = TestSuiteFactory.create(
          { name, endpoint, type: "unit_tests", layer },
          toolset,
          write_method,
          config
        );

        registry.add(suite);
      }

      registry.add(toolset);
    }

    registry.toolsets.forEach((toolset) => {
      const resolved = DependencyResolver.resolveMissingDependencies(
        toolset,
        config,
        writeMethods.relatedComponentsMethods,
        apiSchema
      );
      registry.add(...resolved.models);
      registry.add(...resolved.entities);
    });

    return { components: registry.toArray() };
  }
}
