import { WriteMethod } from "@soapjs/soap-cli-common";
import { Component, TypeInfo } from "../../common";
import { ContainerAddons, ContainerElement, RepositoryBindings } from "./types";
import { RepositoryContainer } from "../new-repository";
import { Config } from "../../../../core";
import { Controller } from "../new-controller";
import { Service } from "../new-service";
import { Toolset } from "../new-toolset";
import { UseCase } from "../new-use-case";

export class Container extends Component<ContainerElement, ContainerAddons> {
  constructor(
    public readonly id: string,
    public readonly type: TypeInfo,
    public readonly path: string,
    public readonly writeMethod: WriteMethod,
    public readonly addons: ContainerAddons,
    public readonly element: ContainerElement
  ) {
    super(id, type, "", path, writeMethod, addons, element);
  }

  addRepositoryBindings(container: RepositoryContainer, config: Config) {
    const bindings: RepositoryBindings = {
      repository: container.repository.type.name,
      impl: "",
      entity: container.entity.type.name,
      contexts: [],
    };
    this.addDependency(container.repository, config);
    this.addDependency(container.entity, config);

    if (container.impl) {
      this.addDependency(container.impl, config);
      bindings.impl = container.impl.type.name;
    }

    container.contexts.forEach((context) => {
      const ctx: any = {
        type: context.model.type.type,
        model: context.model.type.name,
      };
      this.addDependency(context.model, config);

      if (context.mapper) {
        ctx.mapper = context.mapper.type.name;
        this.addDependency(context.mapper, config);
      }

      if (context.collection) {
        ctx.table = context.collection.addons.table;
        if (context.collection.addons.is_custom) {
          ctx.collection = context.collection.type.name;
          this.addDependency(context.collection, config);
        }
      }

      bindings.contexts.push(ctx);
    });

    this.addons.repositories.push(bindings);
  }

  addServiceBindings(item: Service, config: Config) {
    this.addDependency(item, config);
    this.addons.services.push({ service: item.type.name, impl: "" });
  }

  addUseCaseBindings(item: UseCase, config: Config) {
    this.addDependency(item, config);
    this.addons.use_cases.push({ use_case: item.type.name });
  }

  addControllerBindings(item: Controller, config: Config) {
    this.addDependency(item, config);
    this.addons.controllers.push({ controller: item.type.name });
  }

  addToolsetBindings(item: Toolset, config: Config) {
    this.addDependency(item, config);
    this.addons.toolsets.push({ toolset: item.type.name });
  }
}
