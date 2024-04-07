import {
  ClassData,
  ClassSchema,
  Component,
  Config,
  DataProvider,
  InterfaceSchema,
  Service,
  ServiceElement,
  ServiceImplType,
} from "@soapjs/soap-cli-common";
import { ServiceFactoryInput } from "../types";
import {
  InputToDataParser,
  DefaultGroups,
} from "../../../common/input-to-data.parser";

export class ServiceImplFactory {
  static create(
    input: ServiceFactoryInput,
    service: Service,
    config: Config
  ): Component<ServiceElement> {
    const { id, name, endpoint, write_method } = input;
    const references = {
      addons: {},
      dependencies: [service],
    };
    const parser = new InputToDataParser(config);
    const data = parser.parse<ClassData>(
      "service_impl",
      input,
      new DefaultGroups(["common"]),
      references
    );

    const element = ClassSchema.create<ServiceElement>(
      new DataProvider(data.element),
      config,
      references
    );

    if (service) {
      element.addInterface(
        InterfaceSchema.create({ name: service.type.name }, config)
      );
    }

    if (Array.isArray(service?.element.methods)) {
      service.element.methods.forEach((method) => {
        element.addMethod(method);
      });
    }

    if (Array.isArray(service?.element.props)) {
      service.element.props.forEach((prop) => {
        element.addProp(prop);
      });
    }

    const component = Component.create<ServiceElement>(config, {
      id,
      type: ServiceImplType.create(data.element.name, name),
      endpoint,
      path: data.path,
      writeMethod: write_method,
      addons: null,
      element,
      dependencies: references.dependencies,
      rank: data.element.rank,
    });

    return component;
  }
}
