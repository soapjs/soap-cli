import { GenericJson, PropJson } from "@soapjs/soap-cli-common";
import {
  ElementWithProps,
  ElementWithGenerics,
  ComponentElement,
  Component,
  ElementWithImports,
} from "../../../../core";
import { DefaultCliOptions } from "../../common/api.types";

export type NewModelOptions = DefaultCliOptions & {
  name: string;
  endpoint?: string;
  type?: string[];
  props?: string[];
};

export type ModelJson = {
  id?: string;
  name: string;
  endpoint?: string;
  types: string[];
  props?: (PropJson | string)[];
  generics?: GenericJson[];
  alias?: any;
};

export type ModelData = {
  id?: string;
  name: string;
  endpoint?: string;
  type: string;
  props?: (PropJson | string)[];
  generics?: GenericJson[];
  alias?: any;
};

export type ModelAddons = {
  modelType: string;
};

export type ModelElement = ElementWithImports &
  ElementWithProps &
  ElementWithGenerics &
  ComponentElement;

export type Model = Component<ModelElement, ModelAddons>;

export type NewModelJson = {
  models: ModelJson[];
};
