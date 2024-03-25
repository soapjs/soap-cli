import { EntityJson, AdditionalData } from "@soapjs/soap-cli-common";
import { DefaultCliOptions } from "../../../../core";

export type EntityFactoryInput = EntityJson & AdditionalData;
export type NewEntityOptions = DefaultCliOptions & {
  name: string;
  endpoint?: string;
  withModel?: boolean;
  props?: string[];
};
