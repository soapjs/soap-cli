import { DefaultCliOptions } from "../../../../core";

export type NewControllerOptions = DefaultCliOptions & {
  endpoint?: string;
  name?: string;
  handlers: string[];
};
