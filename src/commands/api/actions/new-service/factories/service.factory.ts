import { nanoid } from "nanoid";
import {
  ClassData,
  ClassSchema,
  Component,
  Config,
  DataProvider,
  Service,
  ServiceElement,
  ServiceType,
} from "@soapjs/soap-cli-common";
import { ServiceFactoryInput } from "../types";
import {
  InputToDataParser,
  DefaultGroups,
} from "../../../common/input-to-data.parser";

export class ServiceFactory {
  static create(
    input: ServiceFactoryInput,
    config: Config,
    dependencies: Component[]
  ): Service {
    const { id, name, endpoint, write_method } = input;
    const references = {
      addons: {},
      dependencies: dependencies || [],
    };
    const parser = new InputToDataParser(config);
    const data = parser.parse<ClassData>(
      "service",
      input,
      new DefaultGroups(["common"]),
      references
    );

    const element = ClassSchema.create<ServiceElement>(
      new DataProvider(data.element),
      config,
      references
    );

    const component = Component.create<ServiceElement>(config, {
      id: id || nanoid(),
      type: ServiceType.create(data.element.name, name),
      endpoint,
      path: data.path,
      writeMethod: write_method,
      addons: references.addons,
      element,
      dependencies: references.dependencies,
      rank: data.element.rank,
    });

    return component;
  }
}
