import path from "path";
import { PlannedFile } from "../../io/file-writer";
import { createNameVariants } from "../../templates/naming";

export interface AddQueryPlan {
  name: string;
  feature: string;
  featuresRoot: string;
}

export function createQueryFiles(plan: AddQueryPlan): PlannedFile[] {
  const queryNames = createNameVariants(plan.name);
  const featureNames = createNameVariants(plan.feature);
  const root = path.posix.join(plan.featuresRoot, featureNames.kebabName, "application", "queries");

  return [
    {
      path: `${root}/${queryNames.kebabName}.query.ts`,
      type: "use-case",
      owner: featureNames.kebabName,
      content: createQueryTs(queryNames.pascalName),
    },
    {
      path: `${root}/${queryNames.kebabName}.handler.ts`,
      type: "use-case",
      owner: featureNames.kebabName,
      content: createQueryHandlerTs(queryNames.pascalName, queryNames.kebabName),
    },
    {
      path: `${root}/${queryNames.kebabName}.handler.spec.ts`,
      type: "use-case",
      owner: featureNames.kebabName,
      content: createQueryHandlerSpecTs(queryNames.pascalName, queryNames.kebabName),
    },
  ];
}

export function createQueryIndexFile(feature: string, featuresRoot: string, queryNames: string[]): PlannedFile {
  const featureNames = createNameVariants(feature);
  const uniqueQueryNames = Array.from(new Set(queryNames)).sort();
  const exports = uniqueQueryNames
    .flatMap((queryName) => {
      const names = createNameVariants(queryName);
      return [
        `export * from './${names.kebabName}.query';`,
        `export * from './${names.kebabName}.handler';`,
      ];
    })
    .join("\n");

  return {
    path: path.posix.join(featuresRoot, featureNames.kebabName, "application", "queries", "index.ts"),
    type: "config",
    owner: featureNames.kebabName,
    content: `${exports}
`,
  };
}

export function queryNameFromPath(filePath: string): string | undefined {
  const match = filePath.match(/\/application\/queries\/([^/]+)\.query\.ts$/);
  return match?.[1];
}

export function queryFeatureFromPath(filePath: string, featuresRoot: string): string | undefined {
  const escapedRoot = featuresRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = filePath.match(new RegExp(`^${escapedRoot}/([^/]+)/application/queries/index\\.ts$`));
  return match?.[1];
}

function createQueryTs(className: string): string {
  return `import { BaseQuery } from '@soapjs/soap/cqrs';

export interface ${className}Criteria {
  [key: string]: unknown;
}

export interface ${className}Result {
  [key: string]: unknown;
}

export class ${className}Query extends BaseQuery<${className}Result> {
  constructor(
    public readonly criteria: ${className}Criteria = {},
    initiatedBy?: string,
    correlationId?: string
  ) {
    super(initiatedBy, correlationId);
  }
}
`;
}

function createQueryHandlerTs(className: string, kebabName: string): string {
  return `import { Result } from '@soapjs/soap';
import { QueryHandler as SoapQueryHandler } from '@soapjs/soap/cqrs';
import { QueryHandler } from '@soapjs/soap-express/cqrs';
import { ${className}Query, ${className}Result } from './${kebabName}.query';

export interface ${className}Repository {
  find(query: ${className}Query): Promise<${className}Result> | ${className}Result;
}

@QueryHandler(${className}Query)
export class ${className}Handler implements SoapQueryHandler<${className}Query, ${className}Result> {
  constructor(private readonly repository?: ${className}Repository) {}

  async handle(query: ${className}Query): Promise<Result<${className}Result>> {
    try {
      const output = this.repository
        ? await this.repository.find(query)
        : ({ ...query.criteria } as ${className}Result);

      return Result.withSuccess(output);
    } catch (error) {
      return Result.withFailure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
`;
}

function createQueryHandlerSpecTs(className: string, kebabName: string): string {
  return `import assert from 'node:assert/strict';
import test from 'node:test';
import { Result } from '@soapjs/soap';
import { InMemoryQueryBus } from '@soapjs/soap/cqrs';
import { ${className}Query, ${className}Result } from './${kebabName}.query';
import { ${className}Handler, ${className}Repository } from './${kebabName}.handler';

test('${className}Handler returns a successful Result from a repository port', async () => {
  const repository: ${className}Repository = {
    async find(query) {
      return {
        id: 'existing-id',
        ...query.criteria,
      };
    },
  };
  const handler = new ${className}Handler(repository);

  const result = await handler.handle(new ${className}Query({ id: 'existing-id' }));

  assert.equal(result.isSuccess(), true);
  assert.deepEqual(result.content, {
    id: 'existing-id',
  });
});

test('${className}Query can be dispatched through a CQRS query bus', async () => {
  const bus = new InMemoryQueryBus();
  bus.register(${className}Query, new ${className}Handler());

  const result: Result<${className}Result> = await bus.dispatch(new ${className}Query({ id: 'existing-id' }));

  assert.equal(result.isSuccess(), true);
  assert.deepEqual(result.content, {
    id: 'existing-id',
  });
});
`;
}
