import { Config, Container, Service } from "@soapjs/soap-cli-common";
import { ServiceIocContext } from "./types";

export class ServiceIocContainer {
  constructor(private container: Container, private config: Config) {}

  addBindings(context: ServiceIocContext) {
    const { container, config } = this;
    container.addDependency(context.service, config);
    container.addDependency(context.impl, config);
    container.addBindings({
      services: [
        {
          class_name: context.service.type.name,
          service_impl_class_name: context.impl.type.name,
        },
      ],
    });
  }
}
