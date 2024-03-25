import {
  ClassData,
  ClassSchema,
  Component,
  Config,
  DataProvider,
  GenericDataParser,
  MethodJson,
  ParamDataParser,
  ResultType,
  TypeInfo,
  UseCaseElement,
  UseCaseType,
  VoidType,
} from "@soapjs/soap-cli-common";
import { UseCaseFactoryInput } from "./types";
import {
  DefaultGroups,
  InputToDataParser,
} from "../../common/input-to-data.parser";

export class UseCaseFactory {
  public static create(
    input: UseCaseFactoryInput,
    config: Config
  ): Component<UseCaseElement> {
    const dependencies = [];
    const { id, name, endpoint, write_method } = input;

    const output = input.output ? TypeInfo.create(input.output, config) : null;
    const parser = new InputToDataParser(config);
    const data = parser.parse<ClassData>(
      "use_case",
      input,
      new DefaultGroups(["common"])
    );

    data.element.inheritance.forEach((i) => {
      if (output) {
        i.generics = [GenericDataParser.parse(output.name, config).data];
      }
    });

    const execMethodSchema =
      config.presets.use_case.defaults.common.methods.find((m) =>
        m.meta?.includes("isExec")
      );

    if (execMethodSchema) {
      const execMethod = data.element.methods.find(
        (m) => m.name === execMethodSchema.name
      );
      if (execMethod) {
        execMethod.params = input.input.map(
          (i) => ParamDataParser.parse(i, config).data
        );
        execMethod.return_type = ResultType.create(output || VoidType.create());
      }
    }

    const element = ClassSchema.create<UseCaseElement>(
      new DataProvider(data.element),
      write_method,
      config,
      {
        addons: {},
        dependencies,
      }
    );

    const component = Component.create<UseCaseElement>(config, {
      id,
      type: UseCaseType.create(input.name, name),
      endpoint,
      path: data.path,
      writeMethod: write_method,
      addons: {},
      element,
      dependencies,
    });

    return component;
  }
}
