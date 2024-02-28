import { DefaultCliOptions } from "../../../../core";

export type NewRouteOptions = DefaultCliOptions & {
  name: string;
  path: string;
  method: string;
  controller: string;
  handler: string;
  endpoint?: string;
  auth?: string;
  validate?: boolean;
  body?: string;
  response?: string;
};
