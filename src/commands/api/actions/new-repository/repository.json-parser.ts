import { paramCase } from "change-case";
import chalk from "chalk";
import {
  Collection,
  Component,
  Config,
  DataContext,
  Entity,
  Mapper,
  MethodTools,
  Model,
  PropTools,
  Repository,
  RepositoryContainer,
  RepositoryElement,
  RepositoryImpl,
  RepositoryJson,
  TestCaseSchema,
  TestSuite,
  Texts,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import { CollectionFactory } from "../new-collection";
import { EntityFactory } from "../new-entity";
import { MapperFactory } from "../new-mapper";
import { ModelFactory } from "../new-model";
import { TestSuiteFactory } from "../new-test-suite";
import { RepositoryImplFactory } from "./repository-impl.factory";
import { RepositoryFactory } from "./repository.factory";
import { CommandConfig, DependenciesTools } from "../../../../core";

export class RepositoryJsonParser {
  constructor(
    private config: Config,
    private command: CommandConfig,
    private texts: Texts,
    private writeMethod: { component: WriteMethod; dependency: WriteMethod }
  ) {}

  buildRepository(
    data: RepositoryJson,
    entity: Entity,
    contexts: DataContext[],
    entitiesRef: Entity[],
    modelsRef: Model[]
  ) {
    const { config, writeMethod, texts, command } = this;
    const { name, endpoint, props, methods } = data;

    if (!endpoint && config.components.repository.isEndpointRequired()) {
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
        props: PropTools.arrayToData(props, config, {
          dependencies: [],
          addons: {},
        }),
        methods: MethodTools.arrayToData(methods, config, {
          dependencies: [],
          addons: {},
        }),
      },
      entity,
      writeMethod.component,
      config
    );

    const { models, entities } = DependenciesTools.resolveMissingDependnecies(
      repository,
      config,
      writeMethod.dependency,
      modelsRef,
      entitiesRef
    );

    return { repository, models, entities };
  }

  buildRepositoryImpl(
    data: RepositoryJson,
    entity: Entity,
    repository: Repository,
    contexts: DataContext[],
    entitiesRef: Entity[],
    modelsRef: Model[]
  ) {
    const { config, writeMethod, texts } = this;
    const { name, endpoint, props, methods, impl } = data;

    if (!endpoint && config.components.repository_impl.isEndpointRequired()) {
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
        props: PropTools.arrayToData(props, config, {
          dependencies: [],
          addons: {},
        }),
        methods: MethodTools.arrayToData(methods, config, {
          dependencies: [],
          addons: {},
        }),
        is_custom: impl,
      },
      entity,
      repository,
      contexts,
      writeMethod.component,
      config
    );

    const { models, entities } = DependenciesTools.resolveMissingDependnecies(
      repositoryImpl,
      config,
      writeMethod.dependency,
      modelsRef,
      entitiesRef
    );

    return { repositoryImpl, models, entities };
  }

  buildDataContexts(
    data: RepositoryJson,
    entity: Entity,
    modelsRef: Model[],
    mappersRef: Mapper[],
    collectionsRef: Collection[]
  ) {
    const { config, writeMethod } = this;
    const { endpoint } = data;
    const contexts = [];
    const models: Model[] = [];
    const mappers: Mapper[] = [];
    const collections: Collection[] = [];

    if (Array.isArray(data.contexts)) {
      for (const context of data.contexts) {
        let type;
        let collection;
        let collectionName;
        let mapper;
        let mapperName;
        let model;
        let modelName;
        let table;
        let isCustomCollection = false;

        if (typeof context === "string") {
          type = context;
          collectionName = data.name;
          mapperName = data.name;
          modelName = data.name;
          table = paramCase(`${data.name}.collection`);
        } else {
          type = context.type;
          collectionName = context.collection.name || data.name;
          mapperName = context.mapper || data.name;
          modelName = context.model || data.name;
          isCustomCollection = context.collection.impl;
          table = context.collection.table;
        }

        model = modelsRef.find((s) => {
          return s.type.ref === modelName;
        });
        if (!model) {
          model = ModelFactory.create(
            { name: modelName, endpoint, type },
            writeMethod.dependency,
            config,
            []
          );
          models.push(model);
        }

        collection = collectionsRef.find((s) => s.type.ref === collectionName);
        if (!collection) {
          collection = CollectionFactory.create(
            {
              name: collectionName,
              endpoint,
              storage: type,
              table,
              is_custom: isCustomCollection,
            },
            model,
            writeMethod.dependency,
            config
          );
          collections.push(collection);
        }

        mapper = mappersRef.find((s) => s.type.ref === mapperName);
        if (!mapper) {
          mapper = MapperFactory.create(
            { name: mapperName, endpoint, storage: type },
            entity,
            model,
            writeMethod.dependency,
            config
          );
          mappers.push(mapper);
        }

        contexts.push({ model, mapper, collection });
      }
    }

    return { mappers, collections, models, contexts };
  }

  buildTestSuite(data: RepositoryJson, repository: RepositoryImpl) {
    const { config, writeMethod } = this;
    const { name, endpoint } = data;
    const suite = TestSuiteFactory.create(
      { name, endpoint, type: "unit_tests" },
      repository,
      writeMethod.component,
      config
    );

    repository.element.methods.forEach((method) => {
      suite.element.addTest(
        TestCaseSchema.create({
          group: { name: suite.element.name, is_async: false },
          is_async: method.isAsync,
          name: method.name,
          methods: [method],
        })
      );
    });

    return suite;
  }

  parse(
    list: RepositoryJson[],
    entitiesRef: Entity[],
    modelsRef: Model[],
    mappersRef: Mapper[],
    collectionsRef: Collection[]
  ): {
    repositories: Repository[];
    repository_impls: RepositoryImpl[];
    containers: RepositoryContainer[];
    models: Model[];
    entities: Entity[];
    mappers: Mapper[];
    collections: Collection[];
    test_suites: TestSuite[];
  } {
    const { config, writeMethod, command } = this;
    const repositories: Repository[] = [];
    const repository_impls: RepositoryImpl[] = [];
    const models: Model[] = [];
    const containers: RepositoryContainer[] = [];
    const mappers: Mapper[] = [];
    const collections: Collection[] = [];
    const entities: Entity[] = [];
    const test_suites: TestSuite[] = [];

    for (const data of list) {
      const { endpoint, impl } = data;
      const entityName = data.entity || data.name;
      let entity = entitiesRef.find((e) => e.type.ref === entityName);
      let repositoryImpl: Component<RepositoryElement, any>;

      if (!entity) {
        entity = EntityFactory.create(
          { name: entityName, endpoint },
          null,
          writeMethod.dependency,
          config,
          []
        );
        entities.push(entity);
      }

      const { contexts, ...contextsRest } = this.buildDataContexts(
        data,
        entity,
        modelsRef,
        mappersRef,
        collectionsRef
      );
      collections.push(...contextsRest.collections);
      mappers.push(...contextsRest.mappers);
      models.push(...contextsRest.models);

      const { repository, ...repositoryRest } = this.buildRepository(
        data,
        entity,
        contexts,
        [...entities, ...entitiesRef],
        [...models, ...modelsRef]
      );
      repositories.push(repository);
      entities.push(...repositoryRest.entities);
      models.push(...repositoryRest.models);

      if (impl) {
        const result = this.buildRepositoryImpl(
          data,
          entity,
          repository,
          contexts,
          [...entities, ...entitiesRef],
          [...models, ...modelsRef]
        );
        repositoryImpl = result.repositoryImpl;
        repository_impls.push(repositoryImpl);
        entities.push(...result.entities);
        models.push(...result.models);
      }

      if (repositoryImpl && !command.skip_tests) {
        const suite = this.buildTestSuite(data, repositoryImpl);
        test_suites.push(suite);
      }

      containers.push({
        repository,
        impl: repositoryImpl,
        contexts,
        entity,
      });
    }

    return {
      repositories,
      repository_impls,
      containers,
      models,
      entities,
      mappers,
      collections,
      test_suites,
    };
  }
}
