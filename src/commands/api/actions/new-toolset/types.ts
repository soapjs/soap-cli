import { DefaultCliOptions } from "../../../../core";

export type NewToolsetOptions = DefaultCliOptions & {
  name: string;
  layer: string;
  methods?: string[];
  endpoint?: string;
};
