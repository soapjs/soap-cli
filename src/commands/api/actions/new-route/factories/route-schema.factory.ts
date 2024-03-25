import { nanoid } from "nanoid";
import {
  Component,
  Config,
  RouteSchemaType,
  RouteModel,
  WriteMethod,
  TypeSchema,
  RouteSchemaElement,
  TypeJson,
  PropJson,
  RouteSchema,
} from "@soapjs/soap-cli-common";

export class RouteSchemaFactory {
  public static create(
    name: string,
    endpoint: string,
    pathParams: RouteModel,
    queryParams: RouteModel,
    requestBody: RouteModel,
    writeMethod: WriteMethod,
    config: Config
  ): RouteSchema {
    const { defaults } = config.presets.route_schema;
    const componentName = config.presets.route_schema.generateName(name);
    const componentPath = config.presets.route_schema.generatePath({
      name,
      endpoint,
    }).path;
    const addons = {};
    const dependencies = [];
    const props = [];
    const imports = [];
    let exp;

    if (defaults?.common?.exp) {
      exp = defaults.common.exp;
    }

    if (Array.isArray(defaults?.common?.props)) {
      props.push(...defaults.common.props);
    }

    const required: PropJson = props.find((p) => p.name === "required");
    const properties: PropJson = props.find((p) => p.name === "properties");

    if (Array.isArray(required.value) === false) {
      required.value = [];
    }

    if (typeof properties.value !== "object") {
      properties.value = {};
    }

    if (requestBody) {
      (<string[]>required.value).push("body");
      let type;
      if (typeof requestBody.element.alias === "string") {
        type = requestBody.element.alias;
      } else if (requestBody.element.alias?.isPrimitive) {
        type = requestBody.element.alias.ref;
      } else {
        type = "object";
      }
      const body = { type };

      if (requestBody.element.props.length > 0) {
        body["properties"] = requestBody.element.props.reduce((acc, prop) => {
          acc[prop.name] = { type: prop.type.name };
          return acc;
        }, {});
      }
      properties.value["body"] = body;
    }

    if (queryParams) {
      (<string[]>required.value).push("query");
      properties.value["query"] = queryParams.element.props.reduce(
        (acc, prop) => {
          acc.properties[prop.name] = { type: prop.type.name };
          return acc;
        },
        { properties: {}, type: "object" }
      );
    }
    if (pathParams) {
      (<string[]>required.value).push("params");
      properties.value["params"] = pathParams.element.props.reduce(
        (acc, prop) => {
          acc.properties[prop.name] = { type: prop.type.name };
          return acc;
        },
        { properties: {}, type: "object" }
      );
    }

    const element = TypeSchema.create<RouteSchemaElement>(
      {
        name: componentName,
        props,
        imports,
        exp,
      } as TypeJson,
      config,
      {
        addons,
        dependencies,
      }
    );

    const component = Component.create<RouteSchemaElement>(config, {
      id: nanoid(),
      type: RouteSchemaType.create(componentName, name),
      endpoint,
      path: componentPath,
      writeMethod,
      addons,
      element,
      dependencies,
    });

    return component;
  }
}
