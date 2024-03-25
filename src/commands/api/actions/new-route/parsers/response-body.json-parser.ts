import {
  AnyType,
  ApiSchema,
  ArrayType,
  ComponentRegistry,
  Config,
  PropJson,
  RouteJson,
  RouteModelLabel,
  TypeInfo,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import { RouteModelFactory } from "../factories/route-model.factory";
import { DependencyTools } from "../../../../../core";

export class ResponseBodyJsonParser {
  private registry = new ComponentRegistry();
  constructor(
    private config: Config,
    private writeMethod: { component: WriteMethod; dependency: WriteMethod },
    private apiSchema: ApiSchema
  ) {}

  parseObject(
    data: any,
    name: string,
    endpoint: string,
    method: string,
    write_method: WriteMethod
  ) {
    const props = [];

    Object.keys(data).forEach((key) => {
      const value = data[key];
      const prop: PropJson = { name: key };

      if (value) {
        if (Array.isArray(value)) {
          prop.type = ArrayType.create(AnyType.create()).name;
        } else if (typeof value === "string") {
          prop.type = TypeInfo.create(value, this.config).name;
        } else if (typeof value === "object") {
          const obj = this.parseObject(
            value,
            key,
            endpoint,
            method,
            write_method
          );
          prop.type = obj.type.name;
        } else {
          prop.type = AnyType.create().name;
        }
      }

      props.push(prop);
    });

    const model = RouteModelFactory.create(
      {
        name,
        endpoint,
        method,
        write_method,
        props,
      },
      this.config
    );
    const deps = DependencyTools.resolveMissingDependnecies(
      model,
      this.config,
      write_method,
      this.apiSchema
    );

    this.registry.add(...deps.entities, ...deps.models);

    return model;
  }

  parse(data: RouteJson) {
    const { config, writeMethod } = this;
    const { endpoint, request, response, name } = data;
    const props: PropJson[] = [];

    Object.keys(response).forEach((key) => {
      const value = response[key];
      const prop: PropJson = { name: key };

      if (Array.isArray(value)) {
        prop.type = ArrayType.create(AnyType.create()).name;
      } else if (typeof value === "string") {
        prop.type = TypeInfo.create(value, config).name;
      } else if (value && typeof value === "object") {
        const obj = this.parseObject(
          value,
          `Status${key}`,
          endpoint,
          request.method,
          writeMethod.dependency
        );
        prop.type = obj.type.name;
      } else {
        prop.type = AnyType.create().name;
      }
      props.push(prop);
    });

    const model = RouteModelFactory.create(
      {
        name,
        endpoint,
        method: request.method,
        type: RouteModelLabel.ResponseBody,
        props,
        write_method: writeMethod.dependency,
      },
      config
    );

    const { models, entities } = DependencyTools.resolveMissingDependnecies(
      model,
      config,
      writeMethod.dependency,
      this.apiSchema
    );

    models.forEach((m) => {
      this.registry.add(m);
      model.addDependency(m, config);
    });

    entities.forEach((m) => {
      this.registry.add(m);
      model.addDependency(m, config);
    });

    return { model, components: this.registry.toArray() };
  }
}
