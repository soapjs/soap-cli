import { ProjectDescription, Result } from "@soapjs/soap-cli-common";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { ProjectConfig } from "../project.config";

export class ProjectConfigService {
  private localPath: string;
  constructor(localPath: string) {
    this.localPath = path.join(process.cwd(), localPath);
  }

  async set(project: ProjectDescription): Promise<Result<void>> {
    return writeFile(this.localPath, JSON.stringify(project, null, 2), "utf-8")
      .then(() => Result.withoutContent())
      .catch((error) => Result.withFailure(error));
  }

  async get(): Promise<Result<ProjectConfig>> {
    return readFile(this.localPath, "utf-8")
      .then((json) => {
        return Result.withContent(ProjectConfig.create(JSON.parse(json)));
      })
      .catch((error) => Result.withFailure(error));
  }
}
