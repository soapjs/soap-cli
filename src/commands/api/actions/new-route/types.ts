import {
  AdditionalData,
  ClassJson,
  GenericJson,
  PropJson,
  RouteModelJson,
  RouteRequestJson,
  RouteResponseJson,
} from "@soapjs/soap-cli-common";
import { DefaultCliOptions } from "../../../../core";

export type NewRouteOptions = DefaultCliOptions & {
  name: string;
  path: string;
  method: string;
  controller: string;
  handler: string;
  endpoint?: string;
  auth?: string;
  validate?: boolean;
  cors?: boolean;
  limiter?: boolean;
  body?: string;
  response?: string;
};

export type RouteModelFactoryInput = AdditionalData & {
  method: string;
  name: string;
  endpoint?: string;
  type?: string;
  props?: (PropJson | string)[];
  generics?: GenericJson[];
  alias?: any;
};

export type RouteFactoryInput = ClassJson &
  AdditionalData & {
    id?: string;
    name: string;
    controller: string;
    handler: string;
    endpoint?: string;
    request: RouteRequestJson;
    response?: RouteResponseJson;
  };
