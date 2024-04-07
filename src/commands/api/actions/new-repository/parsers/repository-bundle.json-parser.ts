import {
  ApiSchema,
  Component,
  ComponentRegistry,
  Config,
  RepositoryElement,
  RepositoryJson,
  Texts,
} from "@soapjs/soap-cli-common";
import { EntityFactory } from "../../new-entity";
import { TestSuiteFactory } from "../../new-test-suite";
import { CommandConfig, WriteMethodsAssignment } from "../../../../../core";
import { RepositoryIocContext } from "../types";
import { DataContextJsonParser } from "./data-context.json-parser";
import { RepositoryImplJsonParser } from "./repository-impl.json-parser";
import { RepositoryJsonParser } from "./repository.json-parser";

export class RepositoryBundleJsonParser {
  private dataContextParser: DataContextJsonParser;
  private implParser: RepositoryImplJsonParser;
  private repositoryParser: RepositoryJsonParser;

  constructor(
    private config: Config,
    private command: CommandConfig,
    private writeMethods: WriteMethodsAssignment,
    private texts: Texts,
    private apiSchema: ApiSchema
  ) {
    this.dataContextParser = new DataContextJsonParser(
      config,
      writeMethods,
      apiSchema
    );
    this.implParser = new RepositoryImplJsonParser(
      config,
      texts,
      command,
      writeMethods,
      apiSchema
    );
    this.repositoryParser = new RepositoryJsonParser(
      config,
      texts,
      command,
      writeMethods,
      apiSchema
    );
  }

  private ensureEntity(data, registry) {
    const { config, apiSchema, writeMethods } = this;
    const { endpoint, name } = data;
    const entityName = data.entity || data.name;
    let entity = apiSchema.get({ component: "entity", ref: entityName });

    if (!entity) {
      entity = EntityFactory.create(
        {
          name: entityName,
          endpoint,
          write_method: writeMethods.relatedComponentsMethods.entity,
          rank: 2,
        },
        null,
        config,
        []
      );
      registry.add(entity);
    }

    return entity;
  }

  private ensureContexts(data, entity, registry) {
    const { dataContextParser } = this;
    const { endpoint, name } = data;
    const { contexts, ...ctxDeps } = dataContextParser.parse(
      data.contexts,
      name,
      endpoint,
      entity
    );
    registry.add(...ctxDeps.dependencies);

    return contexts;
  }

  private ensureRepository(data, entity, registry) {
    const { repositoryParser } = this;
    const { repository, dependencies } = repositoryParser.parse(data, entity);
    registry.add(repository, ...dependencies);

    return repository;
  }

  private ensureRepositoryImpl(data, entity, repository, contexts, registry) {
    const { implParser } = this;
    let impl: Component<RepositoryElement, any>;

    if (data.impl) {
      const result = implParser.parse(data, entity, repository, contexts);
      impl = result.repositoryImpl;
      registry.add(impl);
    }

    return impl;
  }

  parse(list: RepositoryJson[]): {
    components: Component[];
    ioc_contexts: RepositoryIocContext[];
  } {
    const { config, command } = this;
    const ioc_contexts: RepositoryIocContext[] = [];
    const registry = new ComponentRegistry();

    for (const data of list) {
      const { endpoint, name } = data;
      const write_method = data.write_method || command.write_method;

      const entity = this.ensureEntity(data, registry);
      const contexts = this.ensureContexts(data, entity, registry);
      const repository = this.ensureRepository(data, entity, registry);
      const impl = this.ensureRepositoryImpl(
        data,
        entity,
        repository,
        contexts,
        registry
      );

      if (impl && !command.no_tests) {
        const suite = TestSuiteFactory.create(
          { name, endpoint, type: "unit_tests" },
          impl,
          write_method,
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
