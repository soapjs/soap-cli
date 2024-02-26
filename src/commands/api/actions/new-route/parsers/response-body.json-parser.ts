import { Config, PropSchema, TypeInfo, UnknownType } from "../../../../../core";
import { Model, ModelFactory } from "../../new-model";
import { RouteModelFactory } from "../route-model.factory";
import { RouteJson } from "../types";
import { Entity, EntityFactory } from "../../new-entity";
import { RouteModelLabel, WriteMethod } from "@soapjs/soap-cli-common";

export class ResponseBodyJsonParser {
  constructor(
    private config: Config,
    private writeMethod: { component: WriteMethod; dependency: WriteMethod },
    private models: Model[],
    private entities: Entity[]
  ) {}

  parseStatusModel(
    status: string,
    value: any,
    data: RouteJson,
    modelsRef: Model[],
    entitiesRef: Entity[]
  ) {
    const { config, writeMethod, models, entities } = this;
    const { endpoint, request, name } = data;
    const props = [];
    const dependencies = [];

    Object.keys(value).forEach((k) => {
      const p = PropSchema.create(`${k}:${value[k]}`, config, {
        dependencies: [],
        addons: {},
      });
      props.push(p);
      p.listTypes().forEach((type) => {
        if (
          type.isRouteModel &&
          modelsRef.findIndex((m) => m.type.name === type.name) === -1
        ) {
          const model = RouteModelFactory.create(
            { name: type.ref, type: type.type, endpoint, method: "" },
            writeMethod.dependency,
            config,
            []
          );
          models.push(model);
          dependencies.push(model);
        } else if (
          type.isModel &&
          modelsRef.findIndex((m) => m.type.name === type.name) === -1
        ) {
          const model = ModelFactory.create(
            { name: type.ref, type: type.type, endpoint },
            writeMethod.dependency,
            config,
            []
          );
          models.push(model);
          dependencies.push(model);
        } else if (
          type.isEntity &&
          entitiesRef.findIndex((m) => m.type.ref === type.ref) === -1
        ) {
          const entity = EntityFactory.create(
            { name: type.ref, endpoint },
            null,
            writeMethod.dependency,
            config,
            []
          );

          entities.push(entity);
          dependencies.push(entity);
        }
      });
    });

    const model = RouteModelFactory.create(
      {
        name,
        endpoint,
        method: request.method,
        type: `Status${status}`,
        props,
      },
      writeMethod.dependency,
      config,
      dependencies
    );

    models.push(model);
    return model;
  }

  parse(data: RouteJson, modelsRef: Model[], entitiesRef: Entity[]) {
    const { config, writeMethod, models } = this;
    const { endpoint, request, response, name } = data;
    const props = [];
    const dependencies = [];

    if (typeof response === "string") {
      const type = TypeInfo.create(response, config);
      if (type.isModel) {
        const body = modelsRef.find(
          (m) => m.type.ref === type.ref && m.type.type === type.type
        );

        if (body) {
          return body;
        }
      }
    } else if (typeof response === "object") {
      Object.keys(response).forEach((status) => {
        const value = response[status];
        let type: TypeInfo;

        if (typeof value === "string") {
          type = TypeInfo.create(value, config);
        } else if (typeof value === "object") {
          const model = this.parseStatusModel(
            status,
            value,
            data,
            modelsRef,
            entitiesRef
          );

          type = model.type;
          dependencies.push(model);
        }
        props.push(
          PropSchema.create(
            { name: status, type: type || UnknownType.create() },
            config,
            {
              dependencies: [],
              addons: {},
            }
          )
        );
      });
    } else {
      return null;
    }

    const model = RouteModelFactory.create(
      {
        name,
        endpoint,
        method: request.method,
        type: RouteModelLabel.ResponseBody,
        props,
      },
      writeMethod.dependency,
      config,
      dependencies
    );

    models.push(model);
    return model;
  }
}
