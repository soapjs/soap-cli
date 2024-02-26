import { ClassJson } from "@soapjs/soap-cli-common";
import {
  ClassData,
  ElementWithProps,
  ElementWithGenerics,
  ComponentElement,
  Component,
  ElementWithImports,
  ElementWithMethods,
} from "../../../../core";
import { DefaultCliOptions } from "../../common/api.types";

export type NewCollectionOptions = DefaultCliOptions & {
  name: string;
  storage: string[];
  table: string;
  endpoint?: string;
  model?: string;
};

export type CollectionJson = ClassJson & {
  id?: string;
  name: string;
  storages: string[];
  table?: string;
  endpoint?: string;
  model?: string;
};

export type CollectionData = ClassData & {
  name: string;
  table: string;
  storage: string;
  endpoint?: string;
};

export type CollectionAddons = {
  storage: string;
  table: string;
};

export type CollectionElement = ElementWithImports &
  ElementWithProps &
  ElementWithMethods &
  ElementWithGenerics &
  ComponentElement;

export type Collection = Component<CollectionElement, CollectionAddons>;

export type NewCollectionJson = {
  collections: CollectionJson[];
};
