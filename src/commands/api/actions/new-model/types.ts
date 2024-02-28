import { DefaultCliOptions } from "../../../../core";

export type NewModelOptions = DefaultCliOptions & {
  name: string;
  endpoint?: string;
  type?: string[];
  props?: string[];
};
