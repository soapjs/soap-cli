import { DefaultCliOptions } from "../../../../core";

export type NewCollectionOptions = DefaultCliOptions & {
  name: string;
  storage: string[];
  table: string;
  endpoint?: string;
  model?: string;
};
