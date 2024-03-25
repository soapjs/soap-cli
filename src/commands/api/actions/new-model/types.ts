import { TypeJson, AdditionalData } from "@soapjs/soap-cli-common";
import { DefaultCliOptions } from "../../../../core";

export type NewModelOptions = DefaultCliOptions & {
  name: string;
  endpoint?: string;
  type?: string[];
  props?: string[];
};

export type ModelFactoryInput = TypeJson &
  AdditionalData & {
    endpoint?: string;
  };
