import { ClassJson } from "@soapjs/soap-cli-common";
import {
  Component,
  ComponentElement,
  ElementWithImports,
  ElementWithMethods,
  ElementWithProps,
} from "../../../../core";
import { DefaultCliOptions } from "../../common/api.types";

export type NewControllerOptions = DefaultCliOptions & {
  endpoint?: string;
  name?: string;
  handlers: string[];
};

export type HandlerJson = {
  name: string;
  input?: any;
  output?: any;
};

export type ControllerJson = ClassJson & {
  name: string;
  endpoint?: string;
  handlers?: HandlerJson[];
};

export type ControllerData = ClassJson & {
  name: string;
  endpoint?: string;
  handlers?: {
    name: string;
    input?: string;
    output?: string;
    prompt?: string;
  }[];
};

export type ControllerElement = ElementWithImports &
  ElementWithProps &
  ElementWithMethods &
  ComponentElement;

export type Controller = Component<ControllerElement>;
