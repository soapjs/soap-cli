import { Config, Container, Controller } from "@soapjs/soap-cli-common";

export class ControllerIocContainer {
  constructor(private container: Container, private config: Config) {}

  addBindings(item: Controller) {
    const { container, config } = this;
    container.addDependency(item, config);
    container.addBindings({ controllers: [{ class_name: item.type.name }] });
  }
}
