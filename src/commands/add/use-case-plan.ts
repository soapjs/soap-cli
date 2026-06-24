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
      content: createUseCaseTs(useCaseNames.pascalName),
    },
    {
      path: `${root}/${useCaseNames.kebabName}.use-case.spec.ts`,
      type: "use-case",
      owner: featureNames.kebabName,
      content: createUseCaseSpecTs(useCaseNames.pascalName, useCaseNames.kebabName),
    },
  ];
}

function createUseCaseTs(className: string): string {
  return `import { Injectable, Result, UseCase } from '@soapjs/soap';

export interface ${className}Input {
  [key: string]: unknown;
}

export interface ${className}Output {
  [key: string]: unknown;
}

@Injectable()
export class ${className}UseCase implements UseCase<${className}Output> {
  async execute(_input: ${className}Input): Promise<Result<${className}Output>> {
    // Example:
    // const result = await this.repository.someMethod(input);
    // if (result.isFailure()) return Result.withFailure(result.failure);
    // return Result.withSuccess(result.content);
    return Result.withSuccess({});
  }
}
`;
}

function createUseCaseSpecTs(className: string, kebabName: string): string {
  return `import assert from 'node:assert/strict';
import test from 'node:test';
import { ${className}UseCase } from './${kebabName}.use-case';

test('${className}UseCase returns a successful Result', async () => {
  const useCase = new ${className}UseCase();

  const result = await useCase.execute({ name: 'Ada' });

  assert.equal(result.isSuccess(), true);
  assert.deepEqual(result.content, {});
});
`;
}
