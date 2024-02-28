import { DefaultCliOptions } from "../../../../core";

export type NewUseCaseOptions = DefaultCliOptions & {
  name: string;
  input?: string[];
  output?: string;
  endpoint?: string;
};
