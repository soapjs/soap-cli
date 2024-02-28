import { Component, Config, TypeInfo } from "../../../core";
import { Controller } from "../actions/new-controller";
import { Entity } from "../actions/new-entity";
import { Mapper } from "../actions/new-mapper";
import { Model } from "../actions/new-model";
import { Repository, RepositoryImpl } from "../actions/new-repository";
import { Route, RouteIO } from "../actions/new-route";
import { Collection } from "../actions/new-collection";
import { Toolset } from "../actions/new-toolset";
import { UseCase } from "../actions/new-use-case";
import { TestSuite } from "../actions/new-test-suite";
import { ApiObject } from "@soapjs/soap-cli-common";
import {
  Container,
  ContainerFactory,
  Launcher,
  LauncherFactory,
  Router,
  RouterFactory,
  Service,
} from "../actions";

export class ApiSchema {
  public readonly toolsets = new ApiComponentCollection<Toolset>();
  public readonly models = new ApiComponentCollection<Model>();
  public readonly entities = new ApiComponentCollection<Entity>();
  public readonly mappers = new ApiComponentCollection<Mapper>();
  public readonly collections = new ApiComponentCollection<Collection>();
  public readonly routes = new ApiComponentCollection<Route>();
  public readonly route_ios = new ApiComponentCollection<RouteIO>();
  public readonly controllers = new ApiComponentCollection<Controller>();
  public readonly use_cases = new ApiComponentCollection<UseCase>();
  public readonly services = new ApiComponentCollection<Service>();
  public readonly repositories = new ApiComponentCollection<Repository>();
  public readonly repository_impls =
    new ApiComponentCollection<RepositoryImpl>();
  public readonly test_suites = new ApiComponentCollection<TestSuite>();

  private _router: Router;
  private _container: Container;
  private _launcher: Launcher;

  constructor(config: Config) {
    this._router = RouterFactory.create(config);
    this._launcher = LauncherFactory.create(config);
    this._container = ContainerFactory.create(config);
  }

  get launcher() {
    return this._launcher;
  }

  get router() {
    return this._router;
  }

  get container() {
    return this._container;
  }

  toObject(): ApiObject {
    const {
      models,
      entities,
      mappers,
      routes,
      services,
      collections,
      toolsets,
      route_ios,
      controllers,
      use_cases,
      repositories,
      repository_impls,
      test_suites,
      router,
      launcher,
      container,
    } = this;

    return {
      toolsets: toolsets.toArray().map((i) => i.toObject()),
      controllers: controllers.toArray().map((i) => i.toObject()),
      models: models.toArray().map((i) => i.toObject()),
      entities: entities.toArray().map((i) => i.toObject()),
      mappers: mappers.toArray().map((i) => i.toObject()),
      collections: collections.toArray().map((i) => i.toObject()),
      routes: routes.toArray().map((i) => i.toObject()),
      services: services.toArray().map((i) => i.toObject()),
      route_ios: route_ios.toArray().map((i) => i.toObject()),
      use_cases: use_cases.toArray().map((i) => i.toObject()),
      repositories: repositories.toArray().map((i) => i.toObject()),
      repository_impls: repository_impls.toArray().map((i) => i.toObject()),
      test_suites: test_suites.toArray().map((i) => i.toObject()),
      launcher: launcher.toObject(),
      router: router.toObject(),
      container: container.toObject(),
    };
  }
}

export class ApiComponentCollection<T extends Component> {
  private _list: T[] = [];

  add(component: T) {
    if (
      this._list.findIndex(
        (i) =>
          i.element.name === component.element.name &&
          TypeInfo.areIdentical(i.type, component.type)
      ) === -1
    ) {
      this._list.push(component);
    }
  }

  forEach(callbackfn: (value: T, index: number, array: T[]) => void) {
    return this._list.forEach(callbackfn);
  }

  find(callbackfn: (value: T) => boolean): T {
    for (const item of this._list) {
      if (callbackfn(item)) {
        return item;
      }
    }
    return null;
  }

  has(callbackfn: (value: T) => boolean): boolean {
    for (const item of this._list) {
      if (callbackfn(item)) {
        return true;
      }
    }
    return false;
  }

  toArray() {
    return [...this._list];
  }
}
