import chalk from "chalk";
import {
  ApiSchema,
  Config,
  DataContext,
  Entity,
  Repository,
  RepositoryJson,
  Texts,
  WriteMethod,
} from "@soapjs/soap-cli-common";

import { RepositoryImplFactory } from "../factories/repository-impl.factory";
import { DependencyTools } from "../../../../../core";

export class RepositoryImplJsonParser {
  constructor(
    private config: Config,
    private texts: Texts,
    private writeMethod: { component: WriteMethod; dependency: WriteMethod },
    private apiSchema: ApiSchema
  ) {}

  parse(
    data: RepositoryJson,
    entity: Entity,
    repository: Repository,
    contexts: DataContext[]
  ) {
    const { config, writeMethod, texts, apiSchema } = this;
    const { name, endpoint, props, methods } = data;

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
        write_method: writeMethod.component,
      },
      contexts,
      config,
      [entity, repository]
    );

    const { models, entities } = DependencyTools.resolveMissingDependnecies(
      repositoryImpl,
      config,
      writeMethod.dependency,
      apiSchema
    );

    return { repositoryImpl, dependencies: [...models, ...entities] };
  }
}
