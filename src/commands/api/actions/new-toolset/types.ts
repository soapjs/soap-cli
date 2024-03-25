import { AdditionalData, ToolsetJson } from "@soapjs/soap-cli-common";
import { DefaultCliOptions } from "../../../../core";

export type ToolsetFactoryInput = ToolsetJson & AdditionalData;
export type NewToolsetOptions = DefaultCliOptions & {
  name: string;
  layer: string;
  methods?: string[];
  endpoint?: string;
};
