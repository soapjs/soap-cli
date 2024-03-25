import { PluginMap, ProjectDescription, Texts } from "@soapjs/soap-cli-common";
import { Frame, InteractionPrompts } from "@soapjs/soap-cli-interactive";

export class DefineResourcesFrame extends Frame<ProjectDescription> {
  public static NAME = "define_resources_frame";

  constructor(protected pluginMap: PluginMap, protected texts: Texts) {
    super(DefineResourcesFrame.NAME);
  }

  public async run() {
    const { texts, pluginMap } = this;
    const languages = pluginMap.object.languages.reduce((acc, c) => {
      acc.push({
        message: c.name,
        name: c.alias,
      });
      return acc;
    }, []);

    let source = "";
    let language = "";
    let preset = "";
    let web_framework = "";
    let auth_framework = "";
    let test_framework = "";
    let valid_framework = "";
    let docs_framework = "";
    let request_collection = "";
    let message_broker = "";
    let platform = "";
    let ioc = "";
    let database = [];

    while (source.length === 0) {
      source = await InteractionPrompts.input(
        texts.get("please_provide_project_source_path"),
        "",
        texts.get("hint___please_provide_project_source_path")
      );
    }

    do {
      language = await InteractionPrompts.select(
        texts.get("please_select_language"),
        languages,
        ["typescript"]
      );
    } while (language.length === 0);

    const moduls = pluginMap.getAllLanguageModules(language);

    const presets = pluginMap.getLanguage(language).presets.reduce((acc, c) => {
      acc.push({
        message: c.name,
        name: c.alias,
      });
      return acc;
    }, []);

    do {
      preset = await InteractionPrompts.select(
        texts.get("please_select_preset"),
        presets,
        ["default"]
      );
    } while (preset.length === 0);

    const iocs = moduls.ioc.reduce(
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

    const databases = moduls.databases.reduce(
      (acc, c) => {
        acc.push({
          message: c.name,
          name: c.alias,
        });

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

    const web_frameworks = moduls.web_frameworks.reduce(
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
      web_framework = await InteractionPrompts.select(
        texts.get("please_select_web_framework"),
        web_frameworks,
        ["none"]
      );
    } while (web_framework.length === 0);

    const platforms = moduls.platforms.reduce(
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
    if (platforms.length > 1) {
      do {
        platform = await InteractionPrompts.select(
          texts.get("please_select_platform"),
          platforms,
          ["none"]
        );
      } while (platform.length === 0);
    }

    const auth_frameworks = moduls.auth_frameworks.reduce(
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

    if (auth_frameworks.length > 1) {
      do {
        auth_framework = await InteractionPrompts.select(
          texts.get("please_select_auth_framework"),
          auth_frameworks,
          ["none"]
        );
      } while (auth_framework.length === 0);
    }

    const test_frameworks = moduls.test_frameworks.reduce(
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

    if (test_frameworks.length > 1) {
      do {
        test_framework = await InteractionPrompts.select(
          texts.get("please_select_test_framework"),
          test_frameworks,
          ["none"]
        );
      } while (test_framework.length === 0);
    }

    const docs_frameworks = moduls.docs_frameworks.reduce(
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

    if (docs_frameworks.length > 1) {
      do {
        docs_framework = await InteractionPrompts.select(
          texts.get("please_select_docs_framework"),
          docs_frameworks,
          ["none"]
        );
      } while (docs_framework.length === 0);
    }

    const valid_frameworks = moduls.valid_frameworks.reduce(
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

    if (valid_frameworks.length > 1) {
      do {
        valid_framework = await InteractionPrompts.select(
          texts.get("please_select_valid_framework"),
          valid_frameworks,
          ["none"]
        );
      } while (valid_framework.length === 0);
    }

    const request_collections = moduls.request_collections.reduce(
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

    if (request_collections.length > 1) {
      do {
        request_collection = await InteractionPrompts.select(
          texts.get("please_select_request_collection"),
          request_collections,
          ["none"]
        );
      } while (request_collection.length === 0);
    }

    const message_brokers = moduls.message_brokers.reduce(
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

    if (message_brokers.length > 1) {
      do {
        message_broker = await InteractionPrompts.select(
          texts.get("please_select_messaging"),
          message_brokers,
          ["none"]
        );
      } while (message_broker.length === 0);
    }

    const result = {
      source,
      language,
      database,
    };

    if (web_framework !== "none") {
      result["web_framework"] = web_framework;
    }

    if (auth_framework !== "none") {
      result["auth_framework"] = auth_framework;
    }

    if (test_framework !== "none") {
      result["test_framework"] = test_framework;
    }

    if (docs_framework !== "none") {
      result["docs_framework"] = docs_framework;
    }

    if (valid_framework !== "none") {
      result["valid_framework"] = valid_framework;
    }

    if (request_collection !== "none") {
      result["request_collection"] = request_collection;
    }

    if (message_broker !== "none") {
      result["message_broker"] = message_broker;
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
