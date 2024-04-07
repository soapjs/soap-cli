import chalk from "chalk";
import {
  ApiSchema,
  Component,
  Config,
  Model,
  ModelJson,
  Texts,
} from "@soapjs/soap-cli-common";
import { ModelFactory } from "./model.factory";
import {
  CommandConfig,
  DependencyResolver,
  WriteMethodsAssignment,
} from "../../../../core";

export class ModelJsonParser {
  constructor(
    private config: Config,
    private command: CommandConfig,
    private writeMethods: WriteMethodsAssignment,
    private texts: Texts,
    private apiSchema: ApiSchema
  ) {}

  parse(list: ModelJson[]): { components: Component[] } {
    const { config, texts, apiSchema, command, writeMethods } = this;
    const models: Model[] = [];

    for (const data of list) {
      const write_method = data.write_method || command.write_method;
      const rank = data.rank || 0;
      if (!data.endpoint && config.presets.model.isEndpointRequired()) {
        console.log(chalk.red(texts.get("missing_endpoint")));
        console.log(
          chalk.yellow(
            texts.get("component_###_skipped").replace("###", data.name)
          )
        );
        continue;
      }

      const { types, ...rest } = data;

      for (const type of types) {
        if (
          models.find((m) => m.type.ref === data.name && m.type.type === type)
        ) {
          continue;
        }

        const { endpoint, name, props, generics, alias } = rest;
        const model = ModelFactory.create(
          {
            endpoint,
            name,
            props,
            generics,
            alias,
            type,
            write_method,
            rank,
          },
          config,
          []
        );

        models.push(model);

        const resolved = DependencyResolver.resolveMissingDependencies(
          model,
          config,
          writeMethods.relatedComponentsMethods,
          apiSchema
        );
        models.push(...resolved.models);
      }
    }

    return { components: models };
  }
}
