import {
  ApiJson,
  ApiSchema,
  CollectionJson,
  Config,
  ControllerJson,
  EntityJson,
  MapperJson,
  ModelJson,
  RepositoryContainer,
  RepositoryJson,
  RouteJson,
  ServiceJson,
  Texts,
  ToolsetJson,
  UseCaseJson,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import { CommandConfig } from "../../../core";
import {
  ModelJsonParser,
  EntityJsonParser,
  ToolsetJsonParser,
  ServiceJsonParser,
  MapperJsonParser,
  CollectionJsonParser,
  UseCaseJsonParse,
  RepositoryJsonParser,
  ControllerJsonParser,
  RouteJsonParser,
  RouterFactory,
  ContainerFactory,
  LauncherFactory,
} from "../actions";

export class ApiJsonParser {
  private apiSchema: ApiSchema;
  private writeMethod: { component: WriteMethod; dependency: WriteMethod };
  private repositoryContainer: RepositoryContainer[] = [];

  constructor(
    private config: Config,
    private command: CommandConfig,
    private texts: Texts
  ) {
    this.apiSchema = new ApiSchema(
      config,
      RouterFactory.create(config),
      ContainerFactory.create(config),
      LauncherFactory.create(config)
    );
    this.writeMethod = {
      component: command.write_method,
      dependency: command.dependencies_write_method,
    };
  }

  parseModels(list: ModelJson[]) {
    const { apiSchema, config, texts, writeMethod } = this;
    const result = new ModelJsonParser(config, texts, writeMethod).build(list);

    result.models.forEach((m) => {
      apiSchema.models.add(m);
    });
  }

  parseEntities(list: EntityJson[]) {
    const { apiSchema, config, texts, writeMethod, command } = this;
    const result = new EntityJsonParser(
      config,
      command,
      texts,
      writeMethod
    ).build(list, apiSchema.models.toArray());

    result.entities.forEach((e) => {
      apiSchema.entities.add(e);
    });

    result.models.forEach((m) => {
      apiSchema.models.add(m);
    });

    result.test_suites.forEach((t) => {
      apiSchema.test_suites.add(t);
    });
  }

  parseTools(list: ToolsetJson[]) {
    const { apiSchema, config, texts, writeMethod, command } = this;
    const result = new ToolsetJsonParser(
      config,
      command,
      texts,
      writeMethod
    ).parse(list, apiSchema.models.toArray(), apiSchema.entities.toArray());

    result.toolsets.forEach((t) => {
      apiSchema.toolsets.add(t);
    });

    result.entities.forEach((e) => {
      apiSchema.entities.add(e);
    });

    result.models.forEach((m) => {
      apiSchema.models.add(m);
    });

    result.test_suites.forEach((t) => {
      apiSchema.test_suites.add(t);
    });
  }

  parseServices(list: ServiceJson[]) {
    const { apiSchema, config, texts, writeMethod, command } = this;
    const result = new ServiceJsonParser(
      config,
      command,
      texts,
      writeMethod
    ).parse(list, apiSchema.models.toArray(), apiSchema.entities.toArray());

    result.services.forEach((t) => {
      apiSchema.services.add(t);
    });

    result.entities.forEach((e) => {
      apiSchema.entities.add(e);
    });

    result.models.forEach((m) => {
      apiSchema.models.add(m);
    });

    result.test_suites.forEach((t) => {
      apiSchema.test_suites.add(t);
    });
  }

  parseMappers(list: MapperJson[]) {
    const { apiSchema, config, texts, writeMethod, command } = this;
    const result = new MapperJsonParser(
      config,
      command,
      texts,
      writeMethod
    ).build(list, apiSchema.entities.toArray(), apiSchema.models.toArray());

    result.mappers.forEach((m) => {
      apiSchema.mappers.add(m);
    });

    result.entities.forEach((e) => {
      apiSchema.entities.add(e);
    });

    result.models.forEach((m) => {
      apiSchema.models.add(m);
    });

    result.test_suites.forEach((t) => {
      apiSchema.test_suites.add(t);
    });
  }

  parseCollections(list: CollectionJson[]) {
    const { apiSchema, config, texts, writeMethod, command } = this;
    const result = new CollectionJsonParser(
      config,
      command,
      texts,
      writeMethod
    ).build(list, apiSchema.models.toArray());

    result.collections.forEach((s) => {
      apiSchema.collections.add(s);
    });

    result.entities.forEach((e) => {
      apiSchema.entities.add(e);
    });

    result.models.forEach((m) => {
      apiSchema.models.add(m);
    });

    result.test_suites.forEach((t) => {
      apiSchema.test_suites.add(t);
    });
  }

  parseUseCases(list: UseCaseJson[]) {
    const { apiSchema, config, texts, writeMethod, command } = this;
    const result = new UseCaseJsonParse(
      config,
      command,
      texts,
      writeMethod
    ).parse(list, apiSchema.models.toArray(), apiSchema.entities.toArray());

    result.use_cases.forEach((u) => {
      apiSchema.use_cases.add(u);
    });

    result.entities.forEach((e) => {
      apiSchema.entities.add(e);
    });

    result.models.forEach((m) => {
      apiSchema.models.add(m);
    });

    result.test_suites.forEach((t) => {
      apiSchema.test_suites.add(t);
    });
  }

  parseRepositories(list: RepositoryJson[]) {
    const { apiSchema, config, texts, writeMethod, command } = this;
    const result = new RepositoryJsonParser(
      config,
      command,
      texts,
      writeMethod
    ).parse(
      list,
      apiSchema.entities.toArray(),
      apiSchema.models.toArray(),
      apiSchema.mappers.toArray(),
      apiSchema.collections.toArray()
    );

    result.repositories.forEach((u) => {
      apiSchema.repositories.add(u);
    });

    result.repository_impls.forEach((u) => {
      apiSchema.repository_impls.add(u);
    });

    result.entities.forEach((e) => {
      apiSchema.entities.add(e);
    });

    result.models.forEach((m) => {
      apiSchema.models.add(m);
    });

    result.mappers.forEach((m) => {
      apiSchema.mappers.add(m);
    });

    result.collections.forEach((s) => {
      apiSchema.collections.add(s);
    });

    result.test_suites.forEach((t) => {
      apiSchema.test_suites.add(t);
    });

    this.repositoryContainer.push(...result.containers);
  }

  parseControllers(list: ControllerJson[]) {
    const { apiSchema, config, texts, writeMethod, command } = this;
    const result = new ControllerJsonParser(
      config,
      command,
      texts,
      writeMethod
    ).parse(list, apiSchema.models.toArray(), apiSchema.entities.toArray());

    result.controllers.forEach((c) => {
      apiSchema.controllers.add(c);
    });

    result.entities.forEach((e) => {
      apiSchema.entities.add(e);
    });

    result.models.forEach((m) => {
      apiSchema.models.add(m);
    });

    result.test_suites.forEach((t) => {
      apiSchema.test_suites.add(t);
    });
  }

  parseRoutes(list: RouteJson[]) {
    const { apiSchema, config, texts, writeMethod, command } = this;
    const result = new RouteJsonParser(
      config,
      command,
      texts,
      writeMethod
    ).build(
      list,
      apiSchema.models.toArray(),
      apiSchema.entities.toArray(),
      apiSchema.controllers.toArray()
    );

    result.routes.forEach((r) => {
      apiSchema.routes.add(r);
    });

    result.route_ios.forEach((r) => {
      apiSchema.route_ios.add(r);
    });

    result.entities.forEach((e) => {
      apiSchema.entities.add(e);
    });

    result.models.forEach((m) => {
      apiSchema.models.add(m);
    });

    result.test_suites.forEach((t) => {
      apiSchema.test_suites.add(t);
    });
  }

  build(json: ApiJson): ApiSchema {
    // console.log("JSON", JSON.stringify(json, null, 2));
    const { config } = this;

    this.parseModels(json.models || []);
    this.parseEntities(json.entities || []);
    this.parseMappers(json.mappers || []);
    this.parseCollections(json.collections || []);
    this.parseUseCases(json.use_cases || []);
    this.parseRepositories(json.repositories || []);
    this.parseControllers(json.controllers || []);
    this.parseRoutes(json.routes || []);
    this.parseTools(json.toolsets || []);
    this.parseServices(json.services || []);

    this.apiSchema.controllers.forEach((controller) => {
      this.apiSchema.container.addControllerBindings(controller, config);
    });

    this.apiSchema.routes.forEach((route) => {
      this.apiSchema.router.addDependency(route, config);
      this.apiSchema.router.addons.routes.push({
        name: route.type.name,
        ...route.addons,
      });

      // route.dependencies.forEach((dep) => {
      //   if (dep.type.isController) {
      //     const ctrl = this.apiSchema.controllers.find(
      //       (c) => c.type.name === dep.type.name
      //     );
      //     if (ctrl) {
      //       this.apiSchema.container.addControllerBindings(ctrl, config);
      //     }
      //   }
      // });
    });

    this.apiSchema.use_cases.forEach((use_case) => {
      this.apiSchema.container.addUseCaseBindings(use_case, config);
    });

    this.apiSchema.toolsets.forEach((toolset) => {
      this.apiSchema.container.addToolsetBindings(toolset, config);
    });

    this.apiSchema.services.forEach((service) => {
      this.apiSchema.container.addServiceBindings(service, config);
    });

    this.repositoryContainer.forEach((container) => {
      this.apiSchema.container.addRepositoryBindings(container, config);
    });

    return this.apiSchema;
  }
}
