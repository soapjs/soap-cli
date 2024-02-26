import { ClassJson, ParamJson } from "@soapjs/soap-cli-common";
import {
  ElementWithProps,
  ElementWithMethods,
  ElementWithGenerics,
  ComponentElement,
  Component,
  ElementWithImports,
} from "../../../../core";
import { DefaultCliOptions } from "../../common/api.types";

export type NewUseCaseOptions = DefaultCliOptions & {
  name: string;
  input?: string[];
  output?: string;
  endpoint?: string;
};

export type UseCaseJson = ClassJson & {
  name: string;
  input: (string | ParamJson)[];
  output?: string;
  endpoint?: string;
};

export type UseCaseData = UseCaseJson;

export type UseCaseElement = ElementWithImports &
  ElementWithProps &
  ElementWithMethods &
  ElementWithGenerics &
  ComponentElement;

export type UseCase = Component<UseCaseElement>;

export type NewUseCaseJson = {
  use_cases: UseCaseJson[];
};
