import {
  ClassData,
  ClassSchema,
  Component,
  Config,
  ControllerElement,
  ControllerType,
  DataProvider,
} from "@soapjs/soap-cli-common";
import { ControllerFactoryInput } from "./types";
import {
  DefaultGroups,
  InputToDataParser,
} from "../../common/input-to-data.parser";

export class ControllerFactory {
  public static create(
    input: ControllerFactoryInput,
    config: Config,
    dependencies?: Component[]
  ): Component<ControllerElement> {
    const { id, name, endpoint, write_method } = input;
    const references = {
      addons: {},
      dependencies: dependencies || [],
    };
    const parser = new InputToDataParser(config);
    const data = parser.parse<ClassData>(
      "controller",
      input,
      new DefaultGroups(["common"]),
      references
    );

    if (Array.isArray(input.handlers)) {
      input.handlers.forEach((handler) => {
        data.element.methods.push(handler);
      });
    }

    const element = ClassSchema.create<ControllerElement>(
      new DataProvider(data.element),
      write_method,
      config,
      references
    );

    const component = Component.create<ControllerElement>(config, {
      id,
      type: ControllerType.create(data.element.name, name),
      endpoint,
      path: data.path,
      writeMethod: write_method,
      addons: references.addons,
      element,
      dependencies: references.dependencies,
    });

    return component;
  }
}
