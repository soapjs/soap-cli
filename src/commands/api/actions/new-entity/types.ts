import { DefaultCliOptions } from "../../../../core";

export type NewEntityOptions = DefaultCliOptions & {
  name: string;
  endpoint?: string;
  withModel?: boolean;
  props?: string[];
};
