import {
  Component,
  ComponentElement,
  ElementWithImports,
  ElementWithMethods,
  ElementWithProps,
} from "../../common";

export type ContainerElement = ElementWithImports &
  ElementWithProps &
  ElementWithMethods &
  ComponentElement;

export type RepositoryContext = {
  type: string;
  model: string;
  mapper: string;
  collection: string;
  table: string;
};

export type RepositoryBindings = {
  repository: string;
  impl: string;
  entity: string;
  contexts: RepositoryContext[];
};

export type ServiceBindings = { service: string; impl: string };
export type UseCaseBindings = { use_case: string };
export type ToolsetBindings = { toolset: string };
export type ControllerBindings = { controller: string };

export type ContainerAddons = {
  repositories: RepositoryBindings[];
  use_cases: UseCaseBindings[];
  services: ServiceBindings[];
  toolsets: ToolsetBindings[];
  controllers: ControllerBindings[];
};
