import path from "path";
import { PlannedFile } from "../../io/file-writer";
import { createNameVariants } from "../../templates/naming";

export interface AddUseCasePlan {
  name: string;
  feature: string;
  featuresRoot: string;
}

export function createUseCaseFiles(plan: AddUseCasePlan): PlannedFile[] {
  const useCaseNames = createNameVariants(plan.name);
  const featureNames = createNameVariants(plan.feature);
  const root = path.posix.join(plan.featuresRoot, featureNames.kebabName, "application", "use-cases");

  return [
    {
      path: `${root}/${useCaseNames.kebabName}.use-case.ts`,
      type: "use-case",
      owner: featureNames.kebabName,
      content: createUseCaseTs(useCaseNames.pascalName, useCaseNames.constantName),
    },
    {
      path: `${root}/${useCaseNames.kebabName}.use-case.spec.ts`,
      type: "use-case",
      owner: featureNames.kebabName,
      content: createUseCaseSpecTs(useCaseNames.pascalName, useCaseNames.kebabName),
    },
  ];
}

function createUseCaseTs(className: string, constantName: string): string {
  return `import { Inject, Injectable, Result, UseCase } from '@soapjs/soap';

export interface ${className}Input {
  [key: string]: unknown;
}

export interface ${className}Output {
  [key: string]: unknown;
}

export interface ${className}Repository {
  save(input: ${className}Input): Promise<${className}Output> | ${className}Output;
}

export const ${constantName}_REPOSITORY = '${className}Repository';

@Injectable()
export class ${className}UseCase implements UseCase<${className}Output> {
  constructor(@Inject(${constantName}_REPOSITORY) private readonly repository: ${className}Repository) {}

  async execute(input: ${className}Input): Promise<Result<${className}Output>> {
    try {
      const output = await this.repository.save(input);
      return Result.withSuccess(output);
    } catch (error) {
      return Result.withFailure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
`;
}

function createUseCaseSpecTs(className: string, kebabName: string): string {
  return `import assert from 'node:assert/strict';
import test from 'node:test';
import { ${className}Repository, ${className}UseCase } from './${kebabName}.use-case';

test('${className}UseCase returns a successful Result from the repository', async () => {
  const repository: ${className}Repository = {
    async save(input) {
      return {
        id: 'generated-id',
        ...input,
      };
    },
  };
  const useCase = new ${className}UseCase(repository);

  const result = await useCase.execute({ name: 'Ada' });

  assert.equal(result.isSuccess(), true);
  assert.deepEqual(result.content, {
    id: 'generated-id',
    name: 'Ada',
  });
});
`;
}
