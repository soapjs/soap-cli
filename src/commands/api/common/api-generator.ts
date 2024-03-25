import chalk from "chalk";
import {
  ApiSchema,
  CliPackageManager,
  Config,
  PluginFacade,
  Result,
} from "@soapjs/soap-cli-common";
import { COMPILER_WORKER_PATH } from "../../../core/workers/worker";
import { CompilationConfig, WorkerPool } from "../../../core";

export class ApiGenerator {
  constructor(
    protected config: Config,
    protected compilation: CompilationConfig,
    protected cliPluginPackageName: string
  ) {}

  public async generate(api: ApiSchema): Promise<Result> {
    const { config, compilation, cliPluginPackageName } = this;
    const obj = api.toObject();
    const packageManager = new CliPackageManager();
    const languageModule =
      packageManager.requirePackage<PluginFacade>(cliPluginPackageName);
    
    const templatesSetup = await languageModule.setupTemplates(config.project);

    if (templatesSetup.isFailure) {
      return Result.withFailure(templatesSetup.failure);
    }

    const { content: models, failure } = languageModule.createTemplateModels(
      obj,
      config.project
    );

    if (failure) {
      return Result.withFailure(failure);
    }
    // console.log("OBJ:", JSON.stringify(obj, null, 2));
    // console.log("MODELS:", JSON.stringify(models, null, 2));
    // throw new Error('CHECK');

    const promises = [];
    const { threadCount, batchSize } = compilation;
    const operationsCount = Math.ceil(models.length / batchSize);
    const usefulThreadCount =
      operationsCount < threadCount ? operationsCount : threadCount;
    const workerPool = new WorkerPool(COMPILER_WORKER_PATH, usefulThreadCount);

    workerPool.setTaskCompleteCallback((data) => {
      if (Array.isArray(data?.state)) {
        data.state.forEach((s) => {
          let circle;
          let statusColor;

          if (s.status === "skipped") {
            circle = `🔵`;
            statusColor = "blue";
          } else if (s.status === "blank") {
            circle = `⚪`;
            statusColor = "whiteBright";
          } else if (s.status === "created") {
            circle = `🟢`;
            statusColor = "green";
          } else if (s.status === "modified") {
            circle = `🟠`;
            statusColor = "yellow";
          } else {
            circle = `🔴`;
            statusColor = "red";
          }

          console.info(
            `${circle}  ${chalk[statusColor](s.status)} ${chalk.grey(s.path)}`
          );
        });
      }
    });

    // workerPool.setTaskErrorCallback((error) => {
    //   console.log(error);
    // });

    for (let i = 0; i < models.length; i += batchSize) {
      const batch = models.slice(i, i + batchSize);
      promises.push(
        workerPool.executeTask({
          code_module: cliPluginPackageName,
          transport: compilation.transport,
          models: batch,
          templates: templatesSetup.content,
          project: config.project,
        })
      );
    }

    try {
      await Promise.all(promises);
      workerPool.shutdown();
      return Result.withoutContent();
    } catch (error) {
      workerPool.shutdown();
      return Result.withFailure(error);
    }
  }
}
