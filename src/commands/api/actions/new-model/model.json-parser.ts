import chalk from "chalk";
import {
  ApiSchema,
  Component,
  Config,
  Model,
  ModelJson,
  Texts,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import { ModelFactory } from "./model.factory";
import { DependencyTools } from "../../../../core";

export class ModelJsonParser {
  constructor(
    private config: Config,
    private texts: Texts,
    private writeMethod: { component: WriteMethod; dependency: WriteMethod },
    private apiSchema: ApiSchema
  ) {}

  parse(
    list: ModelJson[],
    writeMethod?: WriteMethod
  ): { components: Component[] } {
    const { config, texts, apiSchema } = this;
    const models: Model[] = [];

    for (const data of list) {
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
            write_method: writeMethod || this.writeMethod.component,
          },
          config,
          []
        );

        models.push(model);
      }
    }

    models.forEach((model) => {
      const resolved = DependencyTools.resolveMissingDependnecies(
        model,
        config,
        this.writeMethod.dependency,
        apiSchema
      );
      models.push(...resolved.models);
    });

    return { components: models };
  }
}
