import chalk from "chalk";
import { ControllerFactory } from "../controller.factory";
import { TestSuiteFactory } from "../../new-test-suite";
import {
  ApiSchema,
  Component,
  ComponentRegistry,
  Config,
  ControllerJson,
  MethodDataParser,
  Texts,
} from "@soapjs/soap-cli-common";
import {
  CommandConfig,
  DependencyResolver,
  WriteMethodsAssignment,
} from "../../../../../core";

export class ControllerJsonParser {
  constructor(
    private config: Config,
    private command: CommandConfig,
    private writeMethods: WriteMethodsAssignment,
    private texts: Texts,
    private apiSchema: ApiSchema
  ) {}

  parse(list: ControllerJson[]): {
    components: Component[];
  } {
    const { config, texts, command, apiSchema, writeMethods } = this;
    const registry = new ComponentRegistry();

    for (const data of list) {
      const { name, endpoint, handlers, rank, ...rest } = data;
      const context = {
        name,
        endpoint,
        handlers: [],
        write_method: command.write_method,
        rank,
        ...rest,
      };

      if (!endpoint && config.presets.controller.isEndpointRequired()) {
        console.log(chalk.red(texts.get("missing_endpoint")));
        console.log(
          chalk.yellow(texts.get("component_###_skipped").replace("###", name))
        );
        continue;
      }

      if (registry.controllers.find((e) => e.type.ref === name)) {
        continue;
      }

      if (Array.isArray(handlers)) {
        handlers.forEach((handler) => {
          if (handler.return_type?.includes("Result") === false) {
            handler.return_type = `Result<${handler.return_type || "void"}>`;
          }
          context.handlers.push(MethodDataParser.parse(handler, config).data);
        });
      }

      const controller = ControllerFactory.create(
        context,
        config,
        registry.toArray()
      );

      if (!command.no_tests && controller.element.methods.length > 0) {
        //
        const suite = TestSuiteFactory.create(
          { name, endpoint, type: "unit_tests" },
          controller,
          command.write_method,
          config
        );
        registry.add(suite);
      }

      const resolved = DependencyResolver.resolveMissingDependencies(
        controller,
        config,
        writeMethods.relatedComponentsMethods,
        apiSchema
      );

      registry.add(controller, ...resolved.models, ...resolved.entities);
    }

    return { components: registry.toArray() };
  }
}
