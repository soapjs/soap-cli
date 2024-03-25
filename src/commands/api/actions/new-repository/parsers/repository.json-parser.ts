import chalk from "chalk";
import {
  ApiSchema,
  Component,
  Config,
  Entity,
  Repository,
  RepositoryJson,
  Texts,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import { RepositoryFactory } from "../factories/repository.factory";
import { DependencyTools } from "../../../../../core";

export class RepositoryJsonParser {
  constructor(
    private config: Config,
    private texts: Texts,
    private writeMethod: { component: WriteMethod; dependency: WriteMethod },
    private apiSchema: ApiSchema
  ) {}

  parse(
    data: RepositoryJson,
    entity: Entity
  ): {
    repository: Repository;
    dependencies: Component[];
  } {
    const { config, writeMethod, apiSchema, texts } = this;
    const { endpoint, name, props, methods } = data;
    const dependencies = [];

    if (!endpoint && config.presets.repository.isEndpointRequired()) {
      console.log(chalk.red(texts.get("missing_endpoint")));
      console.log(
        chalk.yellow(texts.get("component_###_skipped").replace("###", name))
      );
      return;
    }

    const repository = RepositoryFactory.create(
      {
        name,
        endpoint,
        props,
        methods,
        write_method: writeMethod.component,
      },
      config,
      [entity]
    );

    const { models, entities } = DependencyTools.resolveMissingDependnecies(
      repository,
      config,
      writeMethod.dependency,
      apiSchema
    );
    dependencies.push(...models, ...entities);

    return {
      repository,
      dependencies,
    };
  }
}
