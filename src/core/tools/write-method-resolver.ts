import { WriteMethod } from "@soapjs/soap-cli-common";
import { CommandConfig } from "../config";

export type ComponentWriteMethodMap = {
  model: WriteMethod;
  entity: WriteMethod;
  collection: WriteMethod;
  repository: WriteMethod;
  use_case: WriteMethod;
  mapper: WriteMethod;
  service: WriteMethod;
  toolset: WriteMethod;
  controller: WriteMethod;
  route: WriteMethod;
  route_io: WriteMethod;
  route_model: WriteMethod;
  route_schema: WriteMethod;
};
export type WriteMethodsAssignment = {
  mainComponentMethod: WriteMethod;
  relatedComponentsMethods: ComponentWriteMethodMap;
};

export class WriteMethodResolver {
  static resolveWriteMethods(command: CommandConfig): WriteMethodsAssignment {
    const mainComponentMethod = command.write_method;
    const relatedComponentsMethods: ComponentWriteMethodMap =
      this.initializeComponentWriteMethodMap(command.write_method);

    if (command.no_rel.noRelatives) {
      this.applyNoRelOption(relatedComponentsMethods, command.no_rel.skipped);
    }

    return {
      mainComponentMethod,
      relatedComponentsMethods,
    };
  }

  private static initializeComponentWriteMethodMap(
    defaultWriteMethod: WriteMethod
  ): ComponentWriteMethodMap {
    return {
      model: defaultWriteMethod,
      entity: defaultWriteMethod,
      collection: defaultWriteMethod,
      repository: defaultWriteMethod,
      use_case: defaultWriteMethod,
      mapper: defaultWriteMethod,
      service: defaultWriteMethod,
      toolset: defaultWriteMethod,
      controller: defaultWriteMethod,
      route: defaultWriteMethod,
      route_io: defaultWriteMethod,
      route_model: defaultWriteMethod,
      route_schema: defaultWriteMethod,
    };
  }

  private static applyNoRelOption(
    relatedComponentsMethods: ComponentWriteMethodMap,
    skippedComponents: string[]
  ): void {
    Object.keys(relatedComponentsMethods).forEach((key) => {
      if (skippedComponents.includes(key)) {
        relatedComponentsMethods[key as keyof ComponentWriteMethodMap] =
          WriteMethod.Skip;
      }
    });
  }
}
