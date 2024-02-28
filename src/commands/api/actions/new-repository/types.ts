import { DefaultCliOptions } from "../../../../core";

export type NewRepositoryOptions = DefaultCliOptions & {
  name: string;
  endpoint?: string;
  storage?: string[];
  impl?: boolean;
  entity?: string;
  model?: string;
};
