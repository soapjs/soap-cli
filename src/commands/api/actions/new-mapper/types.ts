import { DefaultCliOptions } from "../../../../core";

export type NewMapperOptions = DefaultCliOptions & {
  name: string;
  endpoint?: string;
  storage?: string[];
  model?: string;
  entity?: string;
};
