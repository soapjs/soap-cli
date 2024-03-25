import { ConfigTools, PluginConfig, Result } from "@soapjs/soap-cli-common";
import axios from "axios";
import { readFile, writeFile } from "fs/promises";
import path from "path";

export class PluginConfigService {
  private localPath: string;
  constructor(localPath: string) {
    this.localPath = path.join(process.cwd(), localPath);
  }

  async sync(url: string): Promise<PluginConfig> {
    const { content: currentConfig, failure: getLocalFailure } =
      await this.getLocal();
    const { content: latestConfig, failure: fetchFailure } = await this.fetch(
      url
    );

    if (getLocalFailure && latestConfig) {
      await this.setLocal(latestConfig);
      return latestConfig;
    }

    if (getLocalFailure && fetchFailure) {
      throw Error("###");
    }

    if (
      ConfigTools.versionToNumber(currentConfig.version) <
      ConfigTools.versionToNumber(latestConfig.version)
    ) {
      await this.setLocal(latestConfig);
      return latestConfig;
    }

    return currentConfig;
  }

  async fetch(url: string): Promise<Result<PluginConfig>> {
    try {
      const response = await axios.get(url);

      if (response.status === 200) {
        return Result.withContent(response.data);
      } else {
        return Result.withFailure(
          new Error(
            `Configuration download failed with status ${response.status}`
          )
        );
      }
    } catch (error) {
      return Result.withFailure(error);
    }
  }

  async setLocal(config: PluginConfig): Promise<Result<void>> {
    return writeFile(this.localPath, JSON.stringify(config, null, 2), "utf-8")
      .then(() => Result.withoutContent())
      .catch((error) => Result.withFailure(error));
  }

  async getLocal(): Promise<Result<PluginConfig>> {
    return readFile(this.localPath, "utf-8")
      .then((local) => {
        return Result.withContent(JSON.parse(local));
      })
      .catch((error) => Result.withFailure(error));
  }
}
