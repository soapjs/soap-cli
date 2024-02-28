import { ClassJson } from "@soapjs/soap-cli-common";
import {
  ClassData,
  ElementWithProps,
  ElementWithMethods,
  ElementWithGenerics,
  ComponentElement,
  Component,
  ElementWithImports,
  TypeObject,
} from "../../../../core";
import { DefaultCliOptions } from "../../common/api.types";
import { Entity, EntityJson } from "../new-entity";
import { MapperJson, Mapper } from "../new-mapper";
import { ModelJson, Model } from "../new-model";
import { CollectionJson, Collection } from "../new-collection";

export type NewRepositoryOptions = DefaultCliOptions & {
  name: string;
  endpoint?: string;
  storage?: string[];
  impl?: boolean;
  entity?: string;
  model?: string;
};

export type DataContextCollectionJson = {
  name: string;
  impl?: boolean;
  table?: string;
};

export type DataContextJson = {
  type: string;
  model?: string;
  collection?: DataContextCollectionJson;
  mapper?: string;
};

export type RepositoryJson = ClassJson & {
  name: string;
  entity: string;
  impl?: boolean;
  endpoint?: string;
  contexts?: (DataContextJson | string)[];
};

export type RepositoryData = ClassData & {
  endpoint?: string;
  is_custom?: boolean;
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

export type DataContext = {
  model: Model;
  collection?: Collection;
  mapper?: Mapper;
};

export type RepositoryContainer = {
  repository: Repository;
  entity: Entity;
  impl: RepositoryImpl;
  contexts: DataContext[];
};
