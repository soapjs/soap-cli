import { ApiSchema, Component, Config, TypeInfo } from "@soapjs/soap-cli-common";
import { ComponentWriteMethodMap } from "./write-method-resolver";
import { ComponentFactory } from "../../commands/api";

export class DependencyResolver {
  static resolveMissingDependencies(
    data: Component,
    config: Config,
    writeMethods: ComponentWriteMethodMap,
    apiSchema: ApiSchema,
    additionalData: { [key: string]: unknown } = {}
  ) {
    const models = [];
    const entities = [];

    data.unresolvedDependencies.forEach((type) => {
      let dependency =
        apiSchema.get(type) ||
        this.createDependency(type, data, config, writeMethods, additionalData);

      if (dependency) {
        this.categorizeDependency(dependency, models, entities, type);
        data.addDependency(dependency, config);
      }
    });

    return { models, entities };
  }

  private static createDependency(
    type: TypeInfo,
    data: Component,
    config: Config,
    writeMethods: ComponentWriteMethodMap,
    additionalData: { [key: string]: unknown }
  ): Component {
    const cdata = {
      endpoint: data.endpoint,
      type: type.type,
      write_method: writeMethods[type.component],
      rank: 2,
      ...additionalData,
    };

    return ComponentFactory.create(type, config, cdata);
  }

  private static categorizeDependency(
    dependency: Component,
    models: Component[],
    entities: Component[],
    type: TypeInfo
  ) {
    if (type.isModel || type.isRouteModel) {
      models.push(dependency);
    } else if (type.isEntity) {
      entities.push(dependency);
    }
  }
}


// export class DependencyResolver {
//   static resolveMissingDependencies(
//     data: Component,
//     config: Config,
//     writeMethods: ComponentWriteMethodMap,
//     apiSchema: ApiSchema,
//     additionalData?: { [key: string]: unknown }
//   ) {
//     const models = [];
//     const entities = [];

//     for (const type of data.unresolvedDependencies) {
//       let dependency = apiSchema.get(type);

//       if (!dependency) {
//         let cdata;

//         if (additionalData) {
//           cdata = {
//             endpoint: data.endpoint,
//             type: type.type,
//             write_method: writeMethods[type.component],
//             rank: 2,
//             ...additionalData,
//           };
//         } else {
//           cdata = {
//             endpoint: data.endpoint,
//             type: type.type,
//             write_method: writeMethods[type.component],
//             rank: 2,
//           };
//         }
//         dependency = ComponentFactory.create(type, config, cdata);

//         if (type.isModel || type.isRouteModel) {
//           models.push(dependency);
//         }
//         if (type.isEntity) {
//           entities.push(dependency);
//         }
//       }
//       data.addDependency(dependency, config);
//     }

//     return { models, entities };
//   }
// }

// if (dependency) {
      //   data.addDependency(dependency, config);
      // } else {
      //   model = ComponentFactory.create(type, this.config, {
      //     endpoint: data.endpoint,
      //     write_method: data.write_method,
      //     method: data.request.method,
      //     type: RouteModelLabel.RequestBody,
      //     alias: type.ref,
      //     rank: data.rank,
      //   });

      //   if (type.isModel) {
      //     const model = ModelFactory.create(
      //       {
      //         name: type.ref,
      //         endpoint: data.endpoint,
      //         type: type.type,
      //         write_method: writeMethods.model,
      //         rank: 2,
      //       },
      //       config
      //     );
      //     models.push(model);
      //     data.addDependency(model, config);
      //   } else if (type.isEntity) {
      //     const entity = EntityFactory.create(
      //       {
      //         name: type.ref,
      //         endpoint: data.endpoint,
      //         write_method: writeMethods.entity,
      //         rank: 2,
      //       },
      //       null,
      //       config
      //     );
      //     entities.push(entity);
      //     data.addDependency(entity, config);
      //   }
      // }