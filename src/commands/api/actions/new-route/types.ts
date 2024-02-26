import { ClassJson, GenericJson, PropJson } from "@soapjs/soap-cli-common";
import {
  ElementWithProps,
  ElementWithMethods,
  ElementWithGenerics,
  ComponentElement,
  Component,
  ElementWithImports,
} from "../../../../core";
import { DefaultCliOptions } from "../../common/api.types";

export type NewRouteOptions = DefaultCliOptions & {
  name: string;
  path: string;
  method: string;
  controller: string;
  handler: string;
  endpoint?: string;
  auth?: string;
  validate?: boolean;
  body?: string;
  response?: string;
};

export type RouteRequestJson = {
  method: string;
  path: string; // includes query_params and path_params
  headers?: { [key: string]: any };
  body?: any;
  validate?: boolean;
  auth?: string;
};

export type RouteResponseJson = {
  [code: number]: any;
};

export type RouteHandlerJson = {
  controller: string; // name/id
  name: string; // name
  input?: string; // model/entity name
  output?: string; // entity name
};

export type RouteJson = ClassJson & {
  id?: string;
  name: string;
  controller: string;
  handler: string;
  endpoint?: string;
  request: RouteRequestJson;
  response?: string | RouteResponseJson;
};

export type RouteData = RouteJson;

export type RouteModelJson = {
  method: string;
  name: string;
  endpoint?: string;
  types: string[];
  props?: (PropJson | string)[];
  generics?: GenericJson[];
};

export type RouteModelData = {
  method: string;
  name: string;
  endpoint?: string;
  type: string;
  alias?: any;
  props?: (PropJson | string)[];
  generics?: GenericJson[];
};

export type RouteElement = ElementWithImports &
  ElementWithProps &
  ElementWithMethods &
  ElementWithGenerics &
  ComponentElement;

export type RouteModelElement = ElementWithImports &
  ElementWithProps &
  ElementWithGenerics &
  ComponentElement;

export type RouteModelAddons = {
  modelType: string;
};

export type Route = Component<RouteElement>;
export type RouteModel = Component<RouteModelElement, RouteModelAddons>;
export type RouteIO = Component<RouteElement>;
