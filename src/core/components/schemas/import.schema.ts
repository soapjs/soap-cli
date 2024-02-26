import path from "path";
import { Config, ConfigInstructionParser } from "../../config";
import { ImportJson, ImportSchemaObject } from "@soapjs/soap-cli-common";

export type ImportData = {
  dflt?: string;
  path?: string;
  ref_path?: string;
  list?: string[];
  alias?: string;
};

export const IMPORT_REGEX =
  /^(import)?\s*(\w+)?(\s*[,]?\s*\{\s*([a-zA-Z, ]+)\s*\})?(\s*\*\s+as\s+(\w+))?\s+from\s+["']([a-zA-Z0-9\/\\\._]+)["'];?$/;

export class ImportTools {
  static stringToData(str: string): ImportData {
    let dflt;
    let path;
    let alias;
    let list = [];

    const match = str.match(IMPORT_REGEX);

    if (match) {
      dflt = match[2];
      alias = match[6];
      path = match[7];

      if (match[4]) {
        list.push(...match[4].split(/,\s*/));
      }
    }

    return {
      dflt,
      path,
      alias,
      list,
    };
  }
  static createRelativeImportPath(
    componentPath: string,
    dependencyPath: string
  ) {
    const relativePath = path.relative(
      path.dirname(componentPath),
      dependencyPath
    );

    if (!relativePath.startsWith(".") && !relativePath.startsWith("..")) {
      return "./" + relativePath;
    }
    return relativePath;
  }
}

export class ImportSchema {
  public static create(
    data: string | ImportData | ImportJson,
    config: Config,
    references?: { [key: string]: unknown; dependencies: any[] },
    meta?: any
  ) {
    let dflt;
    let path;
    let alias;
    let list = [];

    if (typeof data === "string") {
      const match = ImportTools.stringToData(data);

      if (ConfigInstructionParser.hasInstructions(match.dflt)) {
        dflt = ConfigInstructionParser.executeInstructions(
          match.dflt,
          references,
          config
        );
      } else {
        dflt = match.dflt;
      }

      if (ConfigInstructionParser.hasInstructions(match.alias)) {
        alias = ConfigInstructionParser.executeInstructions(
          match.alias,
          references,
          config
        );
      } else {
        alias = match.alias;
      }

      if (ConfigInstructionParser.hasInstructions(match.path)) {
        path = ConfigInstructionParser.executeInstructions(
          match.path,
          references,
          config
        );
      } else {
        path = match.path;
      }
      if (Array.isArray(match.list)) {
        match.list.forEach((l) => {
          if (ConfigInstructionParser.hasInstructions(l)) {
            list.push(
              ConfigInstructionParser.executeInstructions(l, references, config)
            );
          } else {
            list.push(l);
          }
        });
      }
    } else {
      if (ConfigInstructionParser.hasInstructions(data.dflt)) {
        dflt = ConfigInstructionParser.executeInstructions(
          data.dflt,
          references,
          config
        );
      } else {
        dflt = data.dflt;
      }

      if (ConfigInstructionParser.hasInstructions(data.alias)) {
        alias = ConfigInstructionParser.executeInstructions(
          data.alias,
          references,
          config
        );
      } else {
        alias = data.alias;
      }

      let tempPath: string;

      if (ConfigInstructionParser.hasInstructions(data.path)) {
        tempPath = ConfigInstructionParser.executeInstructions(
          data.path,
          references,
          config
        );
      } else {
        tempPath = data.path;
      }

      if (tempPath.includes("@") === false && tempPath.includes("/")) {
        path = ImportTools.createRelativeImportPath(data.ref_path, tempPath);
      } else {
        path = tempPath;
      }
      if (Array.isArray(data.list)) {
        data.list.forEach((l) => {
          if (ConfigInstructionParser.hasInstructions(l)) {
            list.push(
              ConfigInstructionParser.executeInstructions(l, references, config)
            );
          } else {
            list.push(l);
          }
        });
      }
    }

    return new ImportSchema(dflt, path, list, alias, meta);
  }

  constructor(
    public readonly dflt: string,
    public readonly path: string,
    public readonly list: string[],
    public readonly alias: string,
    public readonly meta?: any
  ) {}

  toObject(): ImportSchemaObject {
    const { dflt, path, list, alias, meta } = this;

    return {
      dflt,
      path,
      alias,
      list,
      meta,
    };
  }
}
