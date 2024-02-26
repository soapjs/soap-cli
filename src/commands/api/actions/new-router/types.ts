import {
  Component,
  ComponentElement,
  ElementWithImports,
  ElementWithMethods,
  ElementWithProps,
} from "../../common";

export type RouterElement = ElementWithImports &
  ElementWithProps &
  ElementWithMethods &
  ComponentElement;

export type Router = Component<
  RouterElement,
  { routes: { path: string; controller: string; handler: string }[] }
>;
