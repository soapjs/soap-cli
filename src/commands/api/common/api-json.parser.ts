import {
  ApiJson,
  ApiSchema,
  CollectionJson,
  Config,
  Controller,
  ControllerJson,
  EntityJson,
  MapperJson,
  ModelJson,
  RepositoryJson,
  RouteJson,
  ServiceJson,
  Texts,
  Toolset,
  ToolsetJson,
  UseCase,
  UseCaseJson,
} from "@soapjs/soap-cli-common";
import {
  CommandConfig,
  WriteMethodResolver,
  WriteMethodsAssignment,
} from "../../../core";
import {
  ModelJsonParser,
  EntityJsonParser,
  ToolsetJsonParser,
  ServiceJsonParser,
  MapperJsonParser,
  CollectionJsonParser,
  UseCaseJsonParse,
  ControllerJsonParser,
  RouteJsonParser,
  RouterFactory,
  ContainerFactory,
  LauncherFactory,
  RepositoryIocContainer,
  ControllerIocContainer,
  UseCaseIocContainer,
  ServiceIocContainer,
  ToolsetIocContainer,
  RepositoryBundleJsonParser,
  ConfigFactory,
} from "../actions";

export class ApiJsonParser {
  private apiSchema: ApiSchema;
  private writeMethods: WriteMethodsAssignment;

  constructor(
    private config: Config,
    private command: CommandConfig,
    private texts: Texts
  ) {
    this.apiSchema = new ApiSchema(
      RouterFactory.create(config),
      ContainerFactory.create(config),
      LauncherFactory.create(config),
      ConfigFactory.create(config)
    );

    this.writeMethods = WriteMethodResolver.resolveWriteMethods(command);
  }

  parseModels(list: ModelJson[]) {
    const { apiSchema, config, texts, command, writeMethods } = this;
    const result = new ModelJsonParser(
      config,
      command,
      writeMethods,
      texts,
      apiSchema
    ).parse(list);

    result.components.forEach((m) => {
      apiSchema.add(m);
    });
  }

  parseEntities(list: EntityJson[]) {
    const { apiSchema, config, texts, command, writeMethods } = this;
    const result = new EntityJsonParser(
      config,
      command,
      writeMethods,
      texts,
      apiSchema
    ).parse(list);

    result.components.forEach((e) => {
      apiSchema.add(e);
    });
  }

  parseTools(list: ToolsetJson[]) {
    const { apiSchema, config, texts, command, writeMethods } = this;
    const iocContainer = new ToolsetIocContainer(apiSchema.container, config);
    const result = new ToolsetJsonParser(
      config,
      command,
      writeMethods,
      texts,
      apiSchema
    ).parse(list);

    result.components.forEach((t) => {
      apiSchema.add(t);
      if (t.type.isToolset) {
        iocContainer.addBindings(t as Toolset);
      }
    });
  }

  parseServices(list: ServiceJson[]) {
    const { apiSchema, config, texts, command, writeMethods } = this;
    const iocContainer = new ServiceIocContainer(apiSchema.container, config);
    const result = new ServiceJsonParser(
      config,
      command,
      writeMethods,
      texts,
      apiSchema
    ).parse(list);

    result.components.forEach((t) => {
      apiSchema.add(t);
    });

    result.ioc_contexts.forEach((c) => {
      iocContainer.addBindings(c);
    });
  }

  parseMappers(list: MapperJson[]) {
    const { apiSchema, config, texts, command, writeMethods } = this;
    const result = new MapperJsonParser(
      config,
      command,
      writeMethods,
      texts,
      apiSchema
    ).parse(list);

    result.components.forEach((m) => {
      apiSchema.add(m);
    });
  }

  parseCollections(list: CollectionJson[]) {
    const { apiSchema, config, texts, command, writeMethods } = this;
    const result = new CollectionJsonParser(
      config,
      command,
      writeMethods,
      texts,
      apiSchema
    ).parse(list);

    result.components.forEach((s) => {
      apiSchema.add(s);
    });
  }

  parseUseCases(list: UseCaseJson[]) {
    const { apiSchema, config, texts, command, writeMethods } = this;
    const iocContainer = new UseCaseIocContainer(apiSchema.container, config);
    const result = new UseCaseJsonParse(
      config,
      command,
      writeMethods,
      texts,
      apiSchema
    ).parse(list);

    result.components.forEach((u) => {
      apiSchema.add(u);
      if (u.type.isUseCase) {
        iocContainer.addBindings(u as UseCase);
      }
    });
  }

  parseRepositories(list: RepositoryJson[]) {
    const { apiSchema, config, texts, command, writeMethods } = this;
    const iocContainer = new RepositoryIocContainer(
      apiSchema.container,
      config
    );

    const result = new RepositoryBundleJsonParser(
      config,
      command,
      writeMethods,
      texts,
      apiSchema
    ).parse(list);

    result.components.forEach((u) => {
      apiSchema.add(u);
    });

    result.ioc_contexts.forEach((context) => {
      iocContainer.addBindings(context);
    });
  }

  parseControllers(list: ControllerJson[]) {
    const { apiSchema, config, texts, command, writeMethods } = this;
    const iocContainer = new ControllerIocContainer(
      apiSchema.container,
      config
    );
    const result = new ControllerJsonParser(
      config,
      command,
      writeMethods,
      texts,
      apiSchema
    ).parse(list);

    result.components.forEach((c) => {
      apiSchema.add(c);
      if (c.type.isController) {
        iocContainer.addBindings(c as Controller);
      }
    });
  }

  parseRoutes(list: RouteJson[]) {
    const { apiSchema, config, texts, command, writeMethods } = this;
    const result = new RouteJsonParser(
      config,
      command,
      writeMethods,
      texts,
      apiSchema
    ).parse(list);

    result.components.forEach((c) => {
      apiSchema.add(c);
    });

    apiSchema.router.addRoutes(
      apiSchema.getAll("route"),
      apiSchema.getAll("controller"),
      config
    );
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

    return this.apiSchema;
  }
}
