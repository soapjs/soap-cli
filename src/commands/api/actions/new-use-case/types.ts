import { UseCaseJson, AdditionalData } from "@soapjs/soap-cli-common";
import { DefaultCliOptions } from "../../../../core";

export type NewUseCaseOptions = DefaultCliOptions & {
  name: string;
  input?: string[];
  output?: string;
  endpoint?: string;
};

export type UseCaseFactoryInput = UseCaseJson & AdditionalData;
