import {
  Repository,
  Entity,
  RepositoryImpl,
  DataContext,
  AdditionalData,
  ClassJson,
} from "@soapjs/soap-cli-common";
import { DefaultCliOptions } from "../../../../core";

export type NewRepositoryOptions = DefaultCliOptions & {
  name: string;
  endpoint?: string;
  storage?: string[];
  impl?: boolean;
  entity?: string;
  model?: string;
};

export type RepositoryIocContext = {
  repository: Repository;
  entity: Entity;
  impl: RepositoryImpl;
  contexts: DataContext[];
};

export type RepositoryFactoryInput = ClassJson & AdditionalData & {
  endpoint?: string;
  is_custom?: boolean;
};