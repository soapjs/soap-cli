import { nanoid } from "nanoid";
import {
  AnyType,
  ArrayType,
  ClassData,
  ClassSchema,
  Component,
  Config,
  DataProvider,
  RouteElement,
  RouteIOType,
  RouteModel,
  RouteRequestType,
  RouteResponseType,
  TypeInfo,
} from "@soapjs/soap-cli-common";
import { RouteFactoryInput } from "../types";
import {
  InputToDataParser,
  DefaultGroups,
} from "../../../common/input-to-data.parser";

export class RouteIOFactory {
  public static create(
    data: RouteFactoryInput,
    input: { type: TypeInfo; components: Component[] }[],
    output: { type: TypeInfo; components: Component[] },
    pathParams: RouteModel,
    queryParams: RouteModel,
    requestBody: RouteModel,
    responseBody: RouteModel,
    config: Config
  ): Component<RouteElement> {
    const dependencies = [];

    [pathParams, queryParams, requestBody, responseBody].forEach((dep) => {
      if (dep) {
        dependencies.push(dep);
      }
    });

    input.forEach((i) => {
      dependencies.push(...i.components);
    });

    if (output) {
      dependencies.push(...output.components);
    }

    const {
      id,
      name,
      request: { method },
      endpoint,
      write_method,
    } = data;

    let input_type: TypeInfo;
    const output_type = output?.type;

    if (input.length === 1) {
      input_type = input[0].type;
    } else if (input.length > 1) {
      input_type = ArrayType.create(AnyType.create());
    }

    const references = {
      addons: {
        input,
        output,
        input_type,
        output_type,
        response_type: RouteResponseType.create(responseBody?.type.name),
        request_type: RouteRequestType.create(
          requestBody?.element?.name,
          pathParams?.element?.name,
          queryParams?.element?.name
        ),
      },
      dependencies,
    };

    const parser = new InputToDataParser(config);
    const parsed = parser.parse<ClassData>(
      "route_io",
      data,
      new DefaultGroups(["common", method]),
      references
    );

    const element = ClassSchema.create<RouteElement>(
      new DataProvider(parsed.element),
      config,
      references
    );

    const component = Component.create<RouteElement>(config, {
      id: id || nanoid(),
      type: RouteIOType.create(parsed.element.name, name, method),
      endpoint,
      path: parsed.path,
      writeMethod: write_method,
      addons: references.addons,
      element,
      dependencies: references.dependencies,
      rank: data.rank,
    });

    return component;
  }
}
