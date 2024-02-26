import { MapperJson } from "../actions/new-mapper";
import { RepositoryJson } from "../actions/new-repository";
import { RouteJsonParser, RouteJson } from "../actions/new-route";
import { ModelJson } from "../actions/new-model";
import {
  CollectionJsonParser,
  CollectionJson,
} from "../actions/new-collection";
import { UseCaseJsonParse, UseCaseJson } from "../actions/new-use-case";
import { Config } from "../../../core";
import { ApiSchema } from "./api.schema";
import { ControllerJsonParser } from "../actions/new-controller/controller.json-parser";
import { EntityJsonParser } from "../actions/new-entity/entity.json-parser";
import { MapperJsonParser } from "../actions/new-mapper/mapper.json-parser";
import { ModelJsonParser } from "../actions/new-model/model.json-parser";
import { RepositoryJsonParser } from "../actions/new-repository/repository.json-parser";
import { ApiJson } from "./api.types";
import { ControllerJson } from "../actions/new-controller/types";
import { EntityJson } from "../actions/new-entity/types";
import { ToolsetJson, ToolsetJsonParser } from "../actions/new-toolset";
import { Texts, WriteMethod } from "@soapjs/soap-cli-common";

export class ApiJsonParser {
  private apiSchema: ApiSchema;
  private writeMethod: { component: WriteMethod; dependency: WriteMethod };

  constructor(
    private config: Config,
    private texts: Texts
  ) {
    this.apiSchema = new ApiSchema(config);
    this.writeMethod = {
      component: config.command.write_method,
      dependency: config.command.dependencies_write_method,
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
    const { apiSchema, config, texts, writeMethod } = this;
    const result = new EntityJsonParser(config, texts, writeMethod).build(
      list,
      apiSchema.models.toArray()
    );

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
    const { apiSchema, config, texts, writeMethod } = this;
    const result = new ToolsetJsonParser(config, texts, writeMethod).build(
      list,
      apiSchema.models.toArray(),
      apiSchema.entities.toArray()
    );

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

  parseMappers(list: MapperJson[]) {
    const { apiSchema, config, texts, writeMethod } = this;
    const result = new MapperJsonParser(config, texts, writeMethod).build(
      list,
      apiSchema.entities.toArray(),
      apiSchema.models.toArray()
    );

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
    const { apiSchema, config, texts, writeMethod } = this;
    const result = new CollectionJsonParser(config, texts, writeMethod).build(
      list,
      apiSchema.models.toArray()
    );

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
    const { apiSchema, config, texts, writeMethod } = this;
    const result = new UseCaseJsonParse(config, texts, writeMethod).build(
      list,
      apiSchema.models.toArray(),
      apiSchema.entities.toArray()
    );

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
    const { apiSchema, config, texts, writeMethod } = this;
    const result = new RepositoryJsonParser(config, texts, writeMethod).build(
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

    result.repository_factories.forEach((f) => {
      apiSchema.repository_factories.add(f);
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

    result.sources.forEach((s) => {
      apiSchema.collections.add(s);
    });

    result.test_suites.forEach((t) => {
      apiSchema.test_suites.add(t);
    });
  }

  parseControllers(list: ControllerJson[]) {
    const { apiSchema, config, texts, writeMethod } = this;
    const result = new ControllerJsonParser(config, texts, writeMethod).build(
      list,
      apiSchema.models.toArray(),
      apiSchema.entities.toArray()
    );

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
    const { apiSchema, config, texts, writeMethod } = this;
    const result = new RouteJsonParser(config, texts, writeMethod).build(
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

    this.apiSchema.controllers.forEach((controller) => {
      this.apiSchema.container.addDependency(controller, config);
    });

    this.apiSchema.routes.forEach((route) => {
      this.apiSchema.router.addDependency(route, config);
      this.apiSchema.router.addons.routes.push({
        name: route.type.name,
        ...route.addons,
      });

      route.dependencies.forEach((dep) => {
        if (dep.type.isController) {
          const ctrl = this.apiSchema.controllers.find(
            (c) => c.type.name === dep.type.name
          );
          if (ctrl) {
            this.apiSchema.router.addDependency(ctrl, config);
          }
        }
      });
    });

    this.apiSchema.use_cases.forEach((use_case) => {
      this.apiSchema.container.addDependency(use_case, config);
    });

    this.apiSchema.repositories.forEach((repository) => {
      this.apiSchema.container.addDependency(repository, config);
    });

    this.apiSchema.toolsets.forEach((toolset) => {
      this.apiSchema.container.addDependency(toolset, config);
    });

    return this.apiSchema;
  }
}
