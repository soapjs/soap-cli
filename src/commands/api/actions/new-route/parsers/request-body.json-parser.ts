import {
  Config,
  Entity,
  Model,
  PropSchema,
  RouteJson,
  RouteModelLabel,
  TypeInfo,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import { EntityFactory } from "../../new-entity";
import { ModelFactory } from "../../new-model";
import { RouteModelFactory } from "../route-model.factory";

export class RequestBodyJsonParser {
  constructor(
    private config: Config,
    private writeMethod: { component: WriteMethod; dependency: WriteMethod },
    private models: Model[],
    private entities: Entity[]
  ) {}

  parse(data: RouteJson, modelsRef: Model[], entitiesRef: Entity[]) {
    const { config, writeMethod, models, entities } = this;
    const { endpoint, request, name } = data;
    const props = [];
    const dependencies = [];

    if (typeof request.body === "string") {
      const type = TypeInfo.create(request.body, config);

      if (type.isModel) {
        const body = modelsRef.find(
          (m) => m.type.ref === type.ref && m.type.type === type.type
        );

        if (body) {
          return body;
        }
      } else if (type.isPrimitive) {
        const m = RouteModelFactory.create(
          {
            name,
            endpoint,
            method: request.method,
            type: RouteModelLabel.RequestBody,
            alias: type.ref,
          },
          writeMethod.dependency,
          config,
          dependencies
        );
        models.push(m);
        dependencies.push(m);
        return m;
      }
    } else if (typeof request.body === "object") {
      Object.keys(request.body).forEach((key) => {
        const p = PropSchema.create(`${key}:${request.body[key]}`, config, {
          dependencies: [],
          addons: {},
        });
        props.push(p);
        p.listTypes().forEach((type) => {
          if (
            type.isModel &&
            modelsRef.findIndex((m) => m.type.name === type.name) === -1
          ) {
            const m = ModelFactory.create(
              { name: type.ref, type: type.type, endpoint },
              writeMethod.dependency,
              config,
              []
            );
            models.push(m);
            dependencies.push(m);
          } else if (
            type.isEntity &&
            entitiesRef.findIndex((m) => m.type.ref === type.ref) === -1
          ) {
            const e = EntityFactory.create(
              { name: type.ref, endpoint },
              null,
              writeMethod.dependency,
              config,
              []
            );
            entities.push(e);
            dependencies.push(e);
          }
        });
      });
    } else {
      return null;
    }

    const model = RouteModelFactory.create(
      {
        name,
        endpoint,
        method: request.method,
        type: RouteModelLabel.RequestBody,
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
