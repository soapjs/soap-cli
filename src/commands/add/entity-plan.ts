import path from "path";
import { PlannedFile } from "../../io/file-writer";
import { createNameVariants } from "../../templates/naming";

export interface AddEntityPlan {
  name: string;
  feature: string;
  featuresRoot: string;
}

export function createEntityFiles(plan: AddEntityPlan): PlannedFile[] {
  const entityNames = createNameVariants(plan.name);
  const featureNames = createNameVariants(plan.feature);
  const root = path.posix.join(plan.featuresRoot, featureNames.kebabName, "domain");

  return [
    {
      path: `${root}/${entityNames.kebabName}.entity.ts`,
      type: "entity",
      owner: featureNames.kebabName,
      content: createEntityTs(entityNames.pascalName),
    },
    {
      path: `${root}/${entityNames.kebabName}.entity.spec.ts`,
      type: "entity",
      owner: featureNames.kebabName,
      content: createEntitySpecTs(entityNames.pascalName, entityNames.kebabName),
    },
  ];
}

function createEntityTs(className: string): string {
  return `import { randomUUID } from 'crypto';

export interface ${className}Props {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export class Invalid${className}Error extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Invalid${className}Error';
  }
}

export class ${className} {
  private constructor(public readonly props: ${className}Props) {}

  static create(input: Partial<Pick<${className}Props, 'id' | 'createdAt' | 'updatedAt'>> = {}): ${className} {
    const now = new Date().toISOString();
    const props: ${className}Props = {
      id: input.id ?? randomUUID(),
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
    };

    ${className}.validate(props);
    return new ${className}(props);
  }

  static rehydrate(props: ${className}Props): ${className} {
    ${className}.validate(props);
    return new ${className}(props);
  }

  get id(): string {
    return this.props.id;
  }

  private static validate(props: ${className}Props): void {
    if (!props.id) {
      throw new Invalid${className}Error('${className} id is required.');
    }

    if (!props.createdAt || !props.updatedAt) {
      throw new Invalid${className}Error('${className} timestamps are required.');
    }
  }
}
`;
}

function createEntitySpecTs(className: string, kebabName: string): string {
  return `import assert from 'node:assert/strict';
import test from 'node:test';
import { Invalid${className}Error, ${className} } from './${kebabName}.entity';

test('${className}.create generates identity and timestamps', () => {
  const entity = ${className}.create();

  assert.ok(entity.id);
  assert.ok(entity.props.createdAt);
  assert.ok(entity.props.updatedAt);
});

test('${className}.rehydrate rejects invalid props', () => {
  assert.throws(
    () =>
      ${className}.rehydrate({
        id: '',
        createdAt: '',
        updatedAt: '',
      }),
    Invalid${className}Error
  );
});
`;
}
