import { AdditionalData, ClassJson } from "@soapjs/soap-cli-common";
import { DefaultCliOptions } from "../../../../core";

export type CollectionFactoryInput = ClassJson &
  AdditionalData & {
    name: string;
    table: string;
    type: string;
    endpoint?: string;
    is_custom?: boolean;
  };
export type NewCollectionOptions = DefaultCliOptions & {
  name: string;
  storage: string[];
  table: string;
  endpoint?: string;
  model?: string;
};
