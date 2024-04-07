import chalk from "chalk";
import {
  ApiSchema,
  Component,
  Config,
  Entity,
  Repository,
  RepositoryJson,
  Texts,
} from "@soapjs/soap-cli-common";
import { RepositoryFactory } from "../factories/repository.factory";
import {
  CommandConfig,
  DependencyResolver,
  WriteMethodsAssignment,
} from "../../../../../core";

export class RepositoryJsonParser {
  constructor(
    private config: Config,
    private texts: Texts,
    private command: CommandConfig,
    private writeMethods: WriteMethodsAssignment,
    private apiSchema: ApiSchema
  ) {}

  parse(
    data: RepositoryJson,
    entity: Entity
  ): {
    repository: Repository;
    dependencies: Component[];
  } {
    const { config, apiSchema, texts, writeMethods } = this;
    const { endpoint, name, props, methods, rank } = data;
    const dependencies = [];
    const write_method = data.write_method || this.command.write_method;

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
        write_method,
        rank,
      },
      config,
      [entity]
    );

    const { models, entities } = DependencyResolver.resolveMissingDependencies(
      repository,
      config,
      writeMethods.relatedComponentsMethods,
      apiSchema
    );
    dependencies.push(...models, ...entities);

    return {
      repository,
      dependencies,
    };
  }
}
