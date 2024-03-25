import { ClassJson, AdditionalData } from "@soapjs/soap-cli-common";
import { DefaultCliOptions } from "../../../../core";

export type NewMapperOptions = DefaultCliOptions & {
  name: string;
  endpoint?: string;
  storage?: string[];
  model?: string;
  entity?: string;
};

export type MapperFactoryInput = ClassJson &
  AdditionalData & {
    type: string;
    endpoint?: string;
  };
