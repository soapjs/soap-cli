import {
  AdditionalData,
  Service,
  ServiceImpl,
  ServiceJson,
} from "@soapjs/soap-cli-common";
import { DefaultCliOptions } from "../../../../core";

export type NewServiceOptions = DefaultCliOptions & {
  name: string;
  methods?: string[];
  endpoint?: string;
};

export type ServiceIocContext = {
  service: Service;
  impl: ServiceImpl;
};

export type ServiceFactoryInput = ServiceJson & AdditionalData;
