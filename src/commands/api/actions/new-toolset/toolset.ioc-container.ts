import { Config, Container, Toolset } from "@soapjs/soap-cli-common";

export class ToolsetIocContainer {
  constructor(private container: Container, private config: Config) {}

  addBindings(item: Toolset) {
    const { container, config } = this;
    container.addDependency(item, config);
    container.addBindings({ toolsets: [{ class_name: item.type.name }] });
  }
}
