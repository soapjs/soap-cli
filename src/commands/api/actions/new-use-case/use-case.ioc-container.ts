import { Config, Container, UseCase } from "@soapjs/soap-cli-common";

export class UseCaseIocContainer {
  constructor(private container: Container, private config: Config) {}

  addBindings(item: UseCase) {
    const { container, config } = this;
    container.addDependency(item, config);
    container.addBindings({ use_cases: [{ class_name: item.type.name }] });
  }
}
