import { WriteMethod } from "@soapjs/soap-cli-common";
import {
  Entity,
  EntityFactory,
  Model,
  ModelFactory,
} from "../../commands/api/actions";
import { Config } from "../config";
import { Component } from "./../components/component";

export class DependenciesTools {
  static resolveMissingDependnecies(
    component: Component,
    config: Config,
    writeMethod: WriteMethod,
    modelsRef: Model[],
    entitiesRef: Entity[]
  ) {
    const models = [];
    const entities = [];

    component.unresolvedDependencies.forEach((type) => {
      if (type.isModel) {
        let model;
        model = modelsRef.find(
          (m) => m.type.ref === type.ref && m.type.type === type.type
        );
        if (!model) {
          model = ModelFactory.create(
            { name: type.ref, endpoint: component.endpoint, type: type.type },
            writeMethod,
            config,
            []
          );
          models.push(model);
        }
        component.addDependency(model, config);
      } else if (type.isEntity) {
        let e;
        e = entitiesRef.find((m) => m.type.ref === type.ref);
        if (!e) {
          e = EntityFactory.create(
            { name: type.ref, endpoint: component.endpoint },
            null,
            writeMethod,
            config,
            []
          );
          entities.push(e);
        }
        component.addDependency(e, config);
      }
    });

    return { models, entities };
  }
}
