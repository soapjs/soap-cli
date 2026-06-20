import path from "path";
import { PlannedFile } from "../../io/file-writer";
import { createNameVariants } from "../../templates/naming";

export interface AddCommandPlan {
  name: string;
  feature: string;
  featuresRoot: string;
}

export function createCommandFiles(plan: AddCommandPlan): PlannedFile[] {
  const commandNames = createNameVariants(plan.name);
  const featureNames = createNameVariants(plan.feature);
  const root = path.posix.join(plan.featuresRoot, featureNames.kebabName, "application", "commands");

  return [
    {
      path: `${root}/${commandNames.kebabName}.command.ts`,
      type: "use-case",
      owner: featureNames.kebabName,
      content: createCommandTs(commandNames.pascalName),
    },
    {
      path: `${root}/${commandNames.kebabName}.handler.ts`,
      type: "use-case",
      owner: featureNames.kebabName,
      content: createCommandHandlerTs(commandNames.pascalName, commandNames.kebabName),
    },
    {
      path: `${root}/${commandNames.kebabName}.handler.spec.ts`,
      type: "use-case",
      owner: featureNames.kebabName,
      content: createCommandHandlerSpecTs(commandNames.pascalName, commandNames.kebabName),
    },
  ];
}

export function createCommandIndexFile(feature: string, featuresRoot: string, commandNames: string[]): PlannedFile {
  const featureNames = createNameVariants(feature);
  const uniqueCommandNames = Array.from(new Set(commandNames)).sort();
  const exports = uniqueCommandNames
    .flatMap((commandName) => {
      const names = createNameVariants(commandName);
      return [
        `export * from './${names.kebabName}.command';`,
        `export * from './${names.kebabName}.handler';`,
      ];
    })
    .join("\n");

  return {
    path: path.posix.join(featuresRoot, featureNames.kebabName, "application", "commands", "index.ts"),
    type: "config",
    owner: featureNames.kebabName,
    content: `${exports}
`,
  };
}

export interface CqrsFeatureImports {
  commands: string[];
  queries?: string[];
}

export function createCqrsConfigFile(featuresRoot: string, importsByKind: CqrsFeatureImports | string[]): PlannedFile {
  const normalized = Array.isArray(importsByKind)
    ? { commands: importsByKind, queries: [] }
    : { commands: importsByKind.commands, queries: importsByKind.queries ?? [] };
  const importLines = [
    ...Array.from(new Set(normalized.commands)).sort()
      .map((feature) => `import '../${featuresRoot.replace(/^src\//, "")}/${feature}/application/commands';`),
    ...Array.from(new Set(normalized.queries)).sort()
      .map((feature) => `import '../${featuresRoot.replace(/^src\//, "")}/${feature}/application/queries';`),
  ]
    .join("\n");

  return {
    path: "src/config/cqrs.ts",
    type: "config",
    content: importLines
      ? `${importLines}

export {};
`
      : `// Generated CQRS handler imports. Updated by soap add command/query.
export {};
`,
  };
}

export function commandNameFromPath(filePath: string): string | undefined {
  const match = filePath.match(/\/application\/commands\/([^/]+)\.command\.ts$/);
  return match?.[1];
}

export function commandFeatureFromPath(filePath: string, featuresRoot: string): string | undefined {
  const escapedRoot = featuresRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = filePath.match(new RegExp(`^${escapedRoot}/([^/]+)/application/commands/index\\.ts$`));
  return match?.[1];
}

function createCommandTs(className: string): string {
  return `import { BaseCommand } from '@soapjs/soap/cqrs';

export interface ${className}Payload {
  [key: string]: unknown;
}

export interface ${className}Result {
  [key: string]: unknown;
}

export class ${className}Command extends BaseCommand<${className}Result> {
  constructor(
    public readonly payload: ${className}Payload = {},
    initiatedBy?: string,
    correlationId?: string
  ) {
    super(initiatedBy, correlationId);
  }
}
`;
}

function createCommandHandlerTs(className: string, kebabName: string): string {
  return `import { Result } from '@soapjs/soap/common';
import { CommandHandler as SoapCommandHandler } from '@soapjs/soap/cqrs';
import { CommandHandler } from '@soapjs/soap-express/cqrs';
import { ${className}Command, ${className}Result } from './${kebabName}.command';

export interface ${className}Repository {
  save(command: ${className}Command): Promise<${className}Result> | ${className}Result;
}

@CommandHandler(${className}Command)
export class ${className}Handler implements SoapCommandHandler<${className}Command, ${className}Result> {
  constructor(private readonly repository?: ${className}Repository) {}

  async handle(command: ${className}Command): Promise<Result<${className}Result>> {
    try {
      const output = this.repository
        ? await this.repository.save(command)
        : ({ ...command.payload } as ${className}Result);

      return Result.withSuccess(output);
    } catch (error) {
      return Result.withFailure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
`;
}

function createCommandHandlerSpecTs(className: string, kebabName: string): string {
  return `import assert from 'node:assert/strict';
import test from 'node:test';
import { Result } from '@soapjs/soap/common';
import { InMemoryCommandBus } from '@soapjs/soap/cqrs';
import { ${className}Command, ${className}Result } from './${kebabName}.command';
import { ${className}Handler, ${className}Repository } from './${kebabName}.handler';

test('${className}Handler returns a successful Result from a repository port', async () => {
  const repository: ${className}Repository = {
    async save(command) {
      return {
        id: 'generated-id',
        ...command.payload,
      };
    },
  };
  const handler = new ${className}Handler(repository);

  const result = await handler.handle(new ${className}Command({ name: 'Ada' }));

  assert.equal(result.isSuccess(), true);
  assert.deepEqual(result.content, {
    id: 'generated-id',
    name: 'Ada',
  });
});

test('${className}Command can be dispatched through a CQRS command bus', async () => {
  const bus = new InMemoryCommandBus();
  bus.register(${className}Command, new ${className}Handler());

  const result: Result<${className}Result> = await bus.dispatch(new ${className}Command({ name: 'Ada' }));

  assert.equal(result.isSuccess(), true);
  assert.deepEqual(result.content, {
    name: 'Ada',
  });
});
`;
}
