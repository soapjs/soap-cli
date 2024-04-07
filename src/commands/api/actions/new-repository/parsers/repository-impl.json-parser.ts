import chalk from "chalk";
import {
  ApiSchema,
  Config,
  DataContext,
  Entity,
  Repository,
  RepositoryJson,
  Texts,
} from "@soapjs/soap-cli-common";

import { RepositoryImplFactory } from "../factories/repository-impl.factory";
import {
  CommandConfig,
  DependencyResolver,
  WriteMethodsAssignment,
} from "../../../../../core";

export class RepositoryImplJsonParser {
  constructor(
    private config: Config,
    private texts: Texts,
    private command: CommandConfig,
    private writeMethods: WriteMethodsAssignment,
    private apiSchema: ApiSchema
  ) {}

  parse(
    data: RepositoryJson,
    entity: Entity,
    repository: Repository,
    contexts: DataContext[]
  ) {
    const { config, texts, apiSchema, writeMethods } = this;
    const { name, endpoint, props, methods, rank } = data;
    const write_method = data.write_method || this.command.write_method;

    if (!endpoint && config.presets.repository_impl.isEndpointRequired()) {
      console.log(chalk.red(texts.get("missing_endpoint")));
      console.log(
        chalk.yellow(texts.get("component_###_skipped").replace("###", name))
      );
      return;
    }

    const repositoryImpl = RepositoryImplFactory.create(
      {
        name,
        endpoint,
        props,
        methods,
        is_custom: data.impl,
        write_method,
        rank,
      },
      contexts,
      repository,
      config,
      [entity, repository]
    );

    const { models, entities } = DependencyResolver.resolveMissingDependencies(
      repositoryImpl,
      config,
      writeMethods.relatedComponentsMethods,
      apiSchema
    );

    return { repositoryImpl, dependencies: [...models, ...entities] };
  }
}
