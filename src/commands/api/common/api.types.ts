import {
  Component,
  ComponentElement,
  ElementWithFunctions,
  ElementWithImports,
  ElementWithMethods,
  ElementWithProps,
} from "../../../core";
import { ControllerJson } from "../actions/new-controller/types";
import { EntityJson } from "../actions/new-entity/types";
import { MapperJson } from "../actions/new-mapper";
import { ModelJson } from "../actions/new-model";
import { RepositoryJson } from "../actions/new-repository";
import { RouteJson } from "../actions/new-route";
import { CollectionJson } from "../actions/new-collection";
import { ToolsetJson } from "../actions/new-toolset";
import { UseCaseJson } from "../actions/new-use-case";
import { ServiceJson } from "../actions/new-service";

export type DefaultCliOptions = {
  skipTests?: boolean;
  withDeps?: boolean;
  force?: boolean;
  patch?: boolean;
  json?: string;
  [key: string]: any;
};

export type ApiJson = {
  models?: ModelJson[];
  entities?: EntityJson[];
  mappers?: MapperJson[];
  collections?: CollectionJson[];
  services?: ServiceJson[];
  use_cases?: UseCaseJson[];
  repositories?: RepositoryJson[];
  routes?: RouteJson[];
  controllers?: ControllerJson[];
  toolsets?: ToolsetJson[];
};
