import { DefaultCliOptions } from "../../../../core";

export type NewServiceOptions = DefaultCliOptions & {
  name: string;
  methods?: string[];
  endpoint?: string;
};
