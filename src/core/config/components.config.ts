import { basename, join, resolve } from "path";
import { ComponentsConfigTools } from "./tools";
import { GeneratedPath } from "./config";
import {
  ComponentConfigJson,
  FrameworkDefaults,
} from "@soapjs/soap-cli-common";

export class ComponentConfig {
  public static create(
    root: string,
    type: string,
    data: ComponentConfigJson
  ): ComponentConfig {
    const { name_pattern, element_type, path_pattern, defaults } = data;

    return new ComponentConfig(
      root,
      type,
      name_pattern,
      path_pattern,
      element_type,
      defaults
    );
  }

  constructor(
    public root: string,
    public type: string,
    public namePattern: string,
    public pathPattern: string,
    public elementType: string,
    public defaults: {
      common?: FrameworkDefaults;
      [key: string]: FrameworkDefaults;
    }
  ) {}

  public isEndpointRequired(): boolean {
    return /{{\s*\w*\s*endpoint\s*}}/.test(this.pathPattern);
  }

  public hasDynamicFilename(): boolean {
    return /{{\s*\w*\s*\w+\s*}}/.test(basename(this.pathPattern));
  }

  public generateName(
    name: string,
    rest?: { type?: string; [key: string]: string }
  ): string {
    const { namePattern } = this;
    return ComponentsConfigTools.generateName(namePattern, {
      name,
      ...rest,
    });
  }

  public generatePath(
    replacements: {
      name?: string;
      endpoint?: string;
      type?: string;
      [key: string]: string;
    },
    options?: { useCwd?: boolean }
  ): GeneratedPath {
    const { pathPattern, root } = this;
    return ComponentsConfigTools.generatePath(pathPattern, {
      root: options?.useCwd ? process.cwd() : root,
      ...replacements,
    });
  }
}

export class ComponentsConfig {
  public static create(
    dirname: string,
    data: { [key: string]: ComponentConfigJson }
  ): ComponentsConfig {
    let rootPath = resolve(process.cwd());

    if (rootPath.endsWith(dirname) === false) {
      const sourceIndex = rootPath.lastIndexOf(dirname);
      if (sourceIndex !== -1) {
        rootPath = rootPath.substring(0, sourceIndex + dirname.length);
      } else {
        rootPath = join(rootPath, dirname);
      }
    }

    return new ComponentsConfig(
      rootPath,
      ComponentConfig.create(rootPath, "controller", data.controller),
      ComponentConfig.create(rootPath, "mapper", data.mapper),
      ComponentConfig.create(rootPath, "collection", data.collection),
      ComponentConfig.create(rootPath, "entity", data.entity),
      ComponentConfig.create(rootPath, "model", data.model),
      ComponentConfig.create(rootPath, "repository", data.repository),
      ComponentConfig.create(rootPath, "repository_impl", data.repository_impl),
      ComponentConfig.create(
        rootPath,
        "repository_factory",
        data.repository_factory
      ),
      ComponentConfig.create(rootPath, "use_case", data.use_case),
      ComponentConfig.create(rootPath, "route", data.route),
      ComponentConfig.create(rootPath, "route_model", data.route_model),
      ComponentConfig.create(rootPath, "route_io", data.route_io),
      ComponentConfig.create(rootPath, "toolset", data.toolset),
      ComponentConfig.create(rootPath, "service", data.service),
      //
      ComponentConfig.create(
        rootPath,
        "controller_unit_tests",
        data.controller_unit_tests
      ),
      ComponentConfig.create(
        rootPath,
        "mapper_unit_tests",
        data.mapper_unit_tests
      ),
      ComponentConfig.create(
        rootPath,
        "collection_unit_tests",
        data.collection_unit_tests
      ),
      ComponentConfig.create(
        rootPath,
        "repository_impl_unit_tests",
        data.repository_impl_unit_tests
      ),
      ComponentConfig.create(
        rootPath,
        "repository_factory_unit_tests",
        data.repository_factory_unit_tests
      ),
      ComponentConfig.create(
        rootPath,
        "use_case_unit_tests",
        data.use_case_unit_tests
      ),
      ComponentConfig.create(
        rootPath,
        "route_io_unit_tests",
        data.route_io_unit_tests
      ),
      ComponentConfig.create(
        rootPath,
        "toolset_unit_tests",
        data.toolset_unit_tests
      ),
      ComponentConfig.create(
        rootPath,
        "service_unit_tests",
        data.service_unit_tests
      ),
      ComponentConfig.create(rootPath, "router", data.router),
      ComponentConfig.create(rootPath, "container", data.container),
      ComponentConfig.create(rootPath, "launcher", data.launcher)
    );
  }

  constructor(
    public readonly rootPath: string,
    public readonly controller: ComponentConfig,
    public readonly mapper: ComponentConfig,
    public readonly collection: ComponentConfig,
    public readonly entity: ComponentConfig,
    public readonly model: ComponentConfig,
    public readonly repository: ComponentConfig,
    public readonly repository_impl: ComponentConfig,
    public readonly repository_factory: ComponentConfig,
    public readonly use_case: ComponentConfig,
    public readonly route: ComponentConfig,
    public readonly route_model: ComponentConfig,
    public readonly route_io: ComponentConfig,
    public readonly toolset: ComponentConfig,
    public readonly service: ComponentConfig,
    //
    public readonly controller_unit_tests: ComponentConfig,
    public readonly mapper_unit_tests: ComponentConfig,
    public readonly collection_unit_tests: ComponentConfig,
    public readonly repository_impl_unit_tests: ComponentConfig,
    public readonly repository_factory_unit_tests: ComponentConfig,
    public readonly use_case_unit_tests: ComponentConfig,
    public readonly route_io_unit_tests: ComponentConfig,
    public readonly toolset_unit_tests: ComponentConfig,
    public readonly service_unit_tests: ComponentConfig,
    //
    public readonly router: ComponentConfig,
    public readonly container: ComponentConfig,
    public readonly launcher: ComponentConfig
  ) {}
}
