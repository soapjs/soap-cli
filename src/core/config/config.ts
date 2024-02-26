import { LanguagePluginConfig } from "@soapjs/soap-cli-common";
import { CliConfig } from "./cli.config";
import { LanguageConfig } from "./language.config";
import { CompilationConfig } from "./compilation.config";
import { ComponentsConfig } from "./components.config";
import { ComponentsConfigTools } from "./tools/components-config.tools";
import { DatabaseConfig } from "./database.config";
import { GeneralConfig } from "./general.config";
import { WebFrameworkConfig } from "./web-framework.config";
import { CommandConfig } from "./command.config";
import { ProjectConfig } from "./project.config";

export type GeneratedPath = {
  path: string;
  marker: string;
  hasDynamicFilename: boolean;
};

export type ReservedType = {
  name: string;
  category: "FrameworkDefault" | "DatabaseType" | "Primitive";
};

export class Config {
  public static create(
    cliConfig: CliConfig,
    pluginConfig: LanguagePluginConfig,
    projectConfig: ProjectConfig,
    options: any
  ): Config {
    const general = GeneralConfig.create(cliConfig);
    const compilation = CompilationConfig.create(
      cliConfig,
      pluginConfig.language
    );
    const databases = pluginConfig.databases.map(DatabaseConfig.create);
    const web = pluginConfig.web_frameworks.map(WebFrameworkConfig.create);
    const language = LanguageConfig.create(pluginConfig.language);
    const components = ComponentsConfig.create(
      pluginConfig.language.source_path,
      pluginConfig.architecture.components
    );
    const command = CommandConfig.create(options, cliConfig);

    return new Config(
      projectConfig,
      general,
      compilation,
      databases,
      language,
      web,
      components,
      command
    );
  }

  private __allReservedTypes: ReservedType[] = [];

  constructor(
    public readonly project: ProjectConfig,
    public readonly general: GeneralConfig,
    public readonly compilation: CompilationConfig,
    public readonly databases: DatabaseConfig[],
    public readonly code: LanguageConfig,
    public readonly web: WebFrameworkConfig[],
    public readonly components: ComponentsConfig,
    public readonly command: CommandConfig
  ) {
    if (Array.isArray(databases)) {
      databases.forEach((db) => {
        if (Array.isArray(db.mappings)) {
          db.mappings.forEach((mapping) =>
            this.__allReservedTypes.push({
              name: mapping.dbType,
              category: "DatabaseType",
            })
          );
        }
      });
    }

    if (Array.isArray(code.types)) {
      code.types.forEach((name) => {
        this.__allReservedTypes.push({
          name,
          category: "Primitive",
        });
      });
    }

    Object.keys(components).forEach((name) => {
      if (components[name]?.defaults) {
        ComponentsConfigTools.listTypes(components[name].defaults).forEach(
          (name) => {
            this.__allReservedTypes.push({
              name,
              category: "FrameworkDefault",
            });
          }
        );
      }
    });
  }

  get reservedTypes() {
    return [...this.__allReservedTypes];
  }
}
