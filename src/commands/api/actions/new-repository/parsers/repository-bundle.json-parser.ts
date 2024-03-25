import chalk from "chalk";
import {
  ApiSchema,
  Component,
  ComponentRegistry,
  Config,
  Repository,
  RepositoryElement,
  RepositoryJson,
  TestSuite,
  Texts,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import { EntityFactory } from "../../new-entity";
import { TestSuiteFactory } from "../../new-test-suite";
import { CommandConfig } from "../../../../../core";
import { RepositoryIocContext } from "../types";
import { DataContextJsonParser } from "./data-context.json-parser";
import { RepositoryImplJsonParser } from "./repository-impl.json-parser";
import { RepositoryJsonParser } from "./repository.json-parser";

export class RepositoryBundleJsonParser {
  constructor(
    private config: Config,
    private command: CommandConfig,
    private texts: Texts,
    private writeMethod: { component: WriteMethod; dependency: WriteMethod },
    private apiSchema: ApiSchema
  ) {}

  parse(list: RepositoryJson[]): {
    components: Component[];
    ioc_contexts: RepositoryIocContext[];
  } {
    const { config, writeMethod, command, apiSchema, texts } = this;
    const ioc_contexts: RepositoryIocContext[] = [];
    const registry = new ComponentRegistry();
    const dataContextParser = new DataContextJsonParser(
      config,
      writeMethod,
      apiSchema
    );
    const implParser = new RepositoryImplJsonParser(
      config,
      texts,
      writeMethod,
      apiSchema
    );
    const repositoryParser = new RepositoryJsonParser(
      config,
      texts,
      writeMethod,
      apiSchema
    );

    for (const data of list) {
      const { endpoint, name } = data;

      const entityName = data.entity || data.name;
      let entity = apiSchema.get({ component: "entity", ref: entityName });
      let impl: Component<RepositoryElement, any>;

      if (!entity) {
        entity = EntityFactory.create(
          { name: entityName, endpoint, write_method: writeMethod.dependency },
          null,
          config,
          []
        );
        registry.add(entity);
      }

      const { contexts, ...ctxDeps } = dataContextParser.parse(
        data.contexts,
        name,
        endpoint,
        entity
      );
      registry.add(...ctxDeps.dependencies);

      const { repository, dependencies } = repositoryParser.parse(
        data,
        entity
      );
      registry.add(repository, ...dependencies);

      if (data.impl) {
        const result = implParser.parse(data, entity, repository, contexts);
        impl = result.repositoryImpl;
        registry.add(impl);
      }

      if (impl && !command.skip_tests) {
        const suite = TestSuiteFactory.create(
          { name, endpoint, type: "unit_tests" },
          impl,
          writeMethod.component,
          config
        );
        registry.add(suite);
      }

      ioc_contexts.push({
        repository,
        impl,
        contexts,
        entity,
      });
    }

    return {
      components: registry.toArray(),
      ioc_contexts,
    };
  }
}
