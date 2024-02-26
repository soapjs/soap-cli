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

export type NewToolsetOptions = DefaultCliOptions & {
  name: string;
  layer: string;
  methods?: string[];
  endpoint?: string;
};

export type ToolsetJson = ClassJson & {
  layer: string;
  endpoint?: string;
};

export type ToolsetData = ToolsetJson;

export type ToolsetElement = ElementWithImports &
  ElementWithProps &
  ElementWithMethods &
  ElementWithGenerics &
  ComponentElement;

export type Toolset = Component<ToolsetElement>;

export type NewToolsetJson = ApiJson;
