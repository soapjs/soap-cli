import { AdditionalData, ClassJson, MethodData, TypeInfo } from "@soapjs/soap-cli-common";
import { DefaultCliOptions } from "../../../../core";

export type NewControllerOptions = DefaultCliOptions & {
  endpoint?: string;
  name?: string;
  handlers: string[];
};


export type ControllerFactoryInput = ClassJson &
  AdditionalData & {
    name: string;
    endpoint?: string;
    handlers?: MethodData[];
  };
