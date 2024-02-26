import { ClassJson } from "@soapjs/soap-cli-common";
import {
  Component,
  ComponentElement,
  ElementWithGenerics,
  ElementWithImports,
  ElementWithMethods,
  ElementWithProps,
} from "../../../../core";
import { ApiJson, DefaultCliOptions } from "../../common/api.types";

export type NewServiceOptions = DefaultCliOptions & {
  name: string;
  methods?: string[];
  endpoint?: string;
};

export type ServiceJson = ClassJson & {
  endpoint?: string;
};

export type ServiceData = ServiceJson;

export type ServiceElement = ElementWithImports &
  ElementWithProps &
  ElementWithMethods &
  ElementWithGenerics &
  ComponentElement;

export type Service = Component<ServiceElement>;

export type NewServiceJson = ApiJson;
