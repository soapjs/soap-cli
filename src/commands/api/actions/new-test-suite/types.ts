import {
  Component,
  ComponentElement,
  ElementWithImports,
  ElementWithUnitTests,
} from "../../../../core";

export type TestSuiteElement = ElementWithImports &
  ElementWithUnitTests &
  ComponentElement;

export type TestSuite = Component<TestSuiteElement>;
