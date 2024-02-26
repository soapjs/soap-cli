import {
  Component,
  ComponentElement,
  ElementWithFunctions,
  ElementWithImports,
  ElementWithProps,
} from "../../common";

export type LauncherElement = ElementWithImports &
  ElementWithProps &
  ElementWithFunctions &
  ComponentElement;

export type Launcher = Component<LauncherElement>;
