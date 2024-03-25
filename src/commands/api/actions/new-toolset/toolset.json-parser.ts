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
  Toolset,
  ToolsetJson,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import { TestSuiteFactory } from "../new-test-suite";
import { ToolsetFactory } from "./toolset.factory";
import { CommandConfig, DependencyTools } from "../../../../core";

export class ToolsetJsonParser {
  constructor(
    private config: Config,
    private command: CommandConfig,
    private texts: Texts,
    private writeMethod: { component: WriteMethod; dependency: WriteMethod },
    private apiSchema: ApiSchema
  ) {}

  parse(
    list: ToolsetJson[],
    writeMethod?: WriteMethod
  ): {
    components: Component[];
  } {
    const { config, texts, command, apiSchema } = this;
    const registry = new ComponentRegistry();

    for (const data of list) {
      const { name, endpoint, layer } = data;

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
        { ...data, write_method: writeMethod || this.writeMethod.component },
        config,
        []
      );

      if (!command.skip_tests && toolset.element.methods.length > 0) {
        //
        const suite = TestSuiteFactory.create(
          { name, endpoint, type: "unit_tests", layer },
          toolset,
          this.writeMethod.component,
          config
        );

        registry.add(suite);
      }

      registry.add(toolset);
    }

    registry.toolsets.forEach((toolset) => {
      const resolved = DependencyTools.resolveMissingDependnecies(
        toolset,
        config,
        this.writeMethod.dependency,
        apiSchema
      );
      registry.add(...resolved.models);
      registry.add(...resolved.entities);
    });

    return { components: registry.toArray() };
  }
}
