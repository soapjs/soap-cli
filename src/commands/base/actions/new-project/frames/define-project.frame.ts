import { PluginMap, ProjectDescription, Texts } from "@soapjs/soap-cli-common";
import { Frame, InteractionPrompts } from "@soapjs/soap-cli-interactive";

export class DefineProjectFrame extends Frame<ProjectDescription> {
  public static NAME = "define_project_frame";

  constructor(protected pluginMap: PluginMap, protected texts: Texts) {
    super(DefineProjectFrame.NAME);
  }

  public async run() {
    const { texts, pluginMap } = this;
    const languages = pluginMap.languages.reduce((acc, c) => {
      acc.push({
        message: c.name,
        name: c.alias,
      });
      return acc;
    }, []);

    let name = "";
    let language = "";
    let framework = "";
    let platform = "";
    let ioc = "";
    let database = [];

    while (name.length === 0) {
      name = await InteractionPrompts.input(
        texts.get("please_provide_project_name")
      );
    }

    do {
      language = await InteractionPrompts.select(
        texts.get("please_select_language"),
        languages,
        ["typescript"]
      );
    } while (language.length === 0);

    const iocs = pluginMap.getLanguage(language).ioc.reduce(
      (acc, c) => {
        acc.push({
          message: c.name,
          name: c.alias,
        });

        return acc;
      },
      [
        {
          message: texts.get("none"),
          name: "none",
        },
      ]
    );

    do {
      ioc = await InteractionPrompts.select(
        texts.get("please_select_ioc"),
        iocs,
        ["none"],
        texts.get("hint___please_select_ioc")
      );
    } while (ioc.length === 0);

    const databases = pluginMap.databases.reduce(
      (acc, c) => {
        if (c.packages[language]) {
          acc.push({
            message: c.name,
            name: c.alias,
          });
        }
        return acc;
      },
      [
        {
          message: texts.get("in-memory"),
          name: "memory",
        },
      ]
    );

    do {
      database = await InteractionPrompts.multiSelect(
        texts.get("please_select_databases"),
        databases,
        ["memory"],
        texts.get("hint___please_select_databases")
      );
    } while (database.length === 0);

    const frameworks = pluginMap.web_frameworks.reduce(
      (acc, c) => {
        if (c.packages[language]) {
          acc.push({
            message: c.name,
            name: c.alias,
          });
        }
        return acc;
      },
      [
        {
          message: texts.get("none"),
          name: "none",
        },
      ]
    );

    do {
      framework = await InteractionPrompts.select(
        texts.get("please_select_framework"),
        frameworks,
        ["none"]
      );
    } while (framework.length === 0);

    const platforms = pluginMap.platforms.reduce(
      (acc, c) => {
        if (c.packages[language]) {
          acc.push({
            message: c.name,
            name: c.alias,
          });
        }
        return acc;
      },
      [
        {
          message: texts.get("none"),
          name: "none",
        },
      ]
    );
    if (platforms.length > 1) {
      do {
        platform = await InteractionPrompts.select(
          texts.get("please_select_platform"),
          platforms,
          ["none"]
        );
      } while (platform.length === 0);
    }

    const description: any = await InteractionPrompts.form(
      texts.get("project_form_title"),
      [
        {
          name: "author",
          message: texts.get("author"),
        },
        {
          name: "description",
          message: texts.get("description"),
        },
        {
          name: "license",
          message: texts.get("license"),
          initial: "MIT",
        },
      ]
    );

    const result = {
      source: "",
      name,
      language,
      database,
      ...description,
    };

    if (framework !== "none") {
      result["web_framework"] = framework;
    }

    if (ioc !== "none") {
      result["ioc"] = ioc;
    }

    if (platform !== "none") {
      result["platform"] = platform;
    }

    return result;
  }
}
