import { ClassJson } from "@soapjs/soap-cli-common";
import {
  ClassData,
  ElementWithProps,
  ElementWithMethods,
  ElementWithGenerics,
  ComponentElement,
  Component,
  ElementWithImports,
} from "../../../../core";
import { DefaultCliOptions } from "../../common/api.types";
import { EntityJson } from "../new-entity";
import { MapperJson, Mapper } from "../new-mapper";
import { ModelJson, Model } from "../new-model";
import { CollectionJson, Collection } from "../new-collection";

export type NewRepositoryOptions = DefaultCliOptions & {
  name: string;
  endpoint?: string;
  storage?: string[];
  noImpl?: boolean;
  noInterface?: boolean;
  noFactory?: boolean;
  entity?: string;
  model?: string;
};

export type DataContextJson = {
  type: string;
  model: string;
  source?: string;
  mapper?: string;
};

export type RepositoryJson = ClassJson & {
  name: string;
  entity: string;
  build_interface?: boolean;
  use_default_impl?: boolean;
  build_factory?: boolean;
  endpoint?: string;
  contexts?: (DataContextJson | string)[];
};

export type RepositoryData = ClassData & {
  endpoint?: string;
};

export type NewRepositoryJson = {
  repositories: RepositoryJson[];
  models?: ModelJson[];
  entities?: EntityJson[];
  sources?: CollectionJson[];
  mappers?: MapperJson[];
};

export type RepositoryElement = ElementWithImports &
  ElementWithProps &
  ElementWithMethods &
  ElementWithGenerics &
  ComponentElement;

export type Repository = Component<RepositoryElement>;
export type RepositoryImpl = Component<RepositoryElement>;
export type RepositoryFactory = Component<RepositoryElement>;

export type DataContext = {
  model: Model;
  source?: Collection;
  mapper?: Mapper;
};
