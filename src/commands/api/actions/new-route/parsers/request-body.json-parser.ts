import {
  AnyType,
  ApiSchema,
  ArrayType,
  ComponentRegistry,
  Config,
  Entity,
  Model,
  PropJson,
  PropSchema,
  RouteJson,
  RouteModelLabel,
  TypeInfo,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import { EntityFactory } from "../../new-entity";
import { ModelFactory } from "../../new-model";
import { RouteModelFactory } from "../factories/route-model.factory";
import { ComponentFactory } from "../../../common";
import { DependencyTools } from "../../../../../core";

export class RequestBodyJsonParser {
  private registry = new ComponentRegistry();
  constructor(
    private config: Config,
    private writeMethod: { component: WriteMethod; dependency: WriteMethod },
    private apiSchema: ApiSchema
  ) {}

  parseString(data: RouteJson) {
    const { config, writeMethod } = this;
    const { endpoint, request } = data;
    const type = TypeInfo.create(request.body, config);
    let model;

    if (type.isComponentType) {
      model = this.apiSchema.get(type);
      if (!model) {
        model = ComponentFactory.create(type, config, {
          endpoint,
          write_method: writeMethod.dependency,
          method: request.method,
          type: RouteModelLabel.RequestBody,
          alias: type.ref,
        });
      }
    } else {
      model = RouteModelFactory.create(
        {
          name: type.ref,
          endpoint: data.endpoint,
          method: request.method,
          type: RouteModelLabel.RequestBody,
          alias: type.ref,
          write_method: writeMethod.dependency,
        },
        config
      );
    }

    const { models, entities } = DependencyTools.resolveMissingDependnecies(
      model,
      config,
      writeMethod.dependency,
      this.apiSchema
    );

    return { model, components: [...models, ...entities] };
  }

  parseObject(
    data: any,
    name: string,
    endpoint: string,
    method: string,
    write_method: WriteMethod,
    isNested: boolean,
    type?: string
  ) {
    const { config, writeMethod } = this;
    const props = [];

    Object.keys(data).forEach((key) => {
      const value = data[key];
      const prop: PropJson = { name: key };

      if (value) {
        if (Array.isArray(value)) {
          prop.type = ArrayType.create(AnyType.create()).name;
        } else if (typeof value === "string") {
          prop.type = TypeInfo.create(value, config).name;
        } else if (value && typeof value === "object") {
          const obj = this.parseObject(
            value,
            key,
            endpoint,
            method,
            writeMethod.dependency,
            true
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
        type,
        props,
        write_method,
      },
      config
    );

    if (!isNested) {
      this.registry.add(model);
    }

    const { models, entities } = DependencyTools.resolveMissingDependnecies(
      model,
      config,
      writeMethod.dependency,
      this.apiSchema
    );

    models.forEach((m) => {
      this.registry.add(m);
      if (!isNested) {
        model.addDependency(m, config);
      }
    });

    entities.forEach((m) => {
      this.registry.add(m);
      if (!isNested) {
        model.addDependency(m, config);
      }
    });

    return model;
  }

  parse(data: RouteJson) {
    if (typeof data.request.body === "string") {
      return this.parseString(data);
    } else if (data.request.body && typeof data.request.body === "object") {
      const model = this.parseObject(
        data.request.body,
        data.name,
        data.endpoint,
        data.request.method,
        this.writeMethod.dependency,
        false,
        RouteModelLabel.RequestBody
      );
      return { model, components: this.registry.toArray() };
    }
  }
}
