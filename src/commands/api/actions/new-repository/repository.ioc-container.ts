import {
  Config,
  Container,
  ImportSchema,
  RepositoryBindings,
} from "@soapjs/soap-cli-common";
import { RepositoryIocContext } from "./types";

export class RepositoryIocContainer {
  constructor(private container: Container, private config: Config) {}

  addBindings(context: RepositoryIocContext) {
    const { container, config } = this;
    const bindings: RepositoryBindings = {
      class_name: context.repository.type.name,
      entity: context.entity.type.name,
      contexts: [],
    };
    container.addDependency(context.repository, config);
    container.addDependency(context.entity, config);

    if (context.impl) {
      container.addDependency(context.impl, config);
      bindings.repository_impl_class_name = context.impl.type.name;
    }

    const defaultImplImport =
      config.presets.container.defaults.common.imports.find((i) =>
        i.meta.includes("isDefaultRepositoryImpl")
      );

    if (defaultImplImport) {
      bindings.default_class_name = defaultImplImport.list[0];
    }

    context.contexts.forEach((context) => {
      const type = context.model.type.type;
      const ctx: any = {
        type,
        model: context.model.type.name,
      };
      container.addDependency(context.model, config);

      if (context.mapper) {
        ctx.mapper = context.mapper.type.name;
        container.addDependency(context.mapper, config);
      }

      if (context.collection) {
        ctx.table = context.collection.addons.table;

        if (Array.isArray(config.presets.container.defaults[type]?.imports)) {
          const sourceImport = config.presets.container.defaults[
            type
          ].imports.find((i) => i.meta.includes("isSource"));
          
          const inheritanceImport = config.presets.container.defaults[
            type
          ].imports.find((i) => i.meta.includes("isCollection"));

          const queryFactoryImport = config.presets.container.defaults[
            type
          ].imports.find((i) => i.meta.includes("isQueryFactory"));

          if (sourceImport) {
            container.element.addImport(
              ImportSchema.create(sourceImport, config)
            );
            ctx.source = sourceImport.list[0];
          }

          if (inheritanceImport) {
            container.element.addImport(
              ImportSchema.create(inheritanceImport, config)
            );
            ctx.collection_base_class = inheritanceImport.list[0];
          }

          if (queryFactoryImport) {
            container.element.addImport(
              ImportSchema.create(queryFactoryImport, config)
            );
            ctx.query_factory = queryFactoryImport.list[0];
          }
        }

        if (context.collection.addons.is_custom) {
          ctx.collection = context.collection.type.name;
          container.addDependency(context.collection, config);
        }
      }

      bindings.contexts.push(ctx);
    });

    container.addBindings({ repositories: [bindings] });
  }
}
