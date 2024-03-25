import {
  ApiSchema,
  Component,
  Config,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import { ModelFactory, EntityFactory } from "../../commands/api/actions";

export class DependencyTools {
  static resolveMissingDependnecies(
    data: Component,
    config: Config,
    writeMethod: WriteMethod,
    apiSchema: ApiSchema
  ) {
    const models = [];
    const entities = [];

    for (const type of data.unresolvedDependencies) {
      const dependency = apiSchema.get(type);

      if (dependency) {
        data.addDependency(dependency, config);
      } else {
        if (type.isModel) {
          const model = ModelFactory.create(
            {
              name: type.ref,
              endpoint: data.endpoint,
              type: type.type,
              write_method: writeMethod,
            },
            config
          );
          models.push(model);
          data.addDependency(model, config);
        } else if (type.isEntity) {
          const entity = EntityFactory.create(
            {
              name: type.ref,
              endpoint: data.endpoint,
              write_method: writeMethod,
            },
            null,
            config
          );
          entities.push(entity);
          data.addDependency(entity, config);
        }
      }
    }

    return { models, entities };
  }
}
