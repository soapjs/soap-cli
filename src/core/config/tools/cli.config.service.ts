import { Result } from "@soapjs/soap-cli-common";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { CliConfig } from "../cli.config";
import DefaultCliConfig from "../../../defaults/cli.config.json";
import DefaultRootConfig from "../../../defaults/root.config.json";

export class CliConfigService {
  private localPath = path.join(
    process.cwd(),
    DefaultRootConfig.local_cli_config_path
  );

  async sync(): Promise<CliConfig> {
    const { content: currentConfig, failure: getLocalFailure } =
      await this.getLocal();

    if (getLocalFailure) {
      await this.setLocal(DefaultCliConfig);
      return DefaultCliConfig;
    }

    return currentConfig;
  }

  async setLocal(config: CliConfig): Promise<Result<void>> {
    return writeFile(this.localPath, JSON.stringify(config, null, 2), "utf-8")
      .then(() => Result.withoutContent())
      .catch((error) => Result.withFailure(error));
  }

  async getLocal(): Promise<Result<CliConfig>> {
    return readFile(this.localPath, "utf-8")
      .then((local) => {
        return Result.withContent(JSON.parse(local));
      })
      .catch((error) => Result.withFailure(error));
  }
}
