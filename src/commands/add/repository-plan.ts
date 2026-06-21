import path from "path";
import { DatabaseCapability } from "../../config/schemas/types";
import { PlannedFile } from "../../io/file-writer";
import { createNameVariants } from "../../templates/naming";

type RepositoryDb = Extract<DatabaseCapability, "mongo" | "postgres" | "mysql" | "sqlite">;

export interface AddRepositoryPlan {
  name: string;
  feature: string;
  db: RepositoryDb;
  featuresRoot: string;
}

export function createRepositoryFiles(plan: AddRepositoryPlan): PlannedFile[] {
  const repositoryNames = createNameVariants(plan.name);
  const featureNames = createNameVariants(plan.feature);
  const root = path.posix.join(plan.featuresRoot, featureNames.kebabName);
  const commonFiles: PlannedFile[] = [
    {
      path: `${root}/application/ports/${repositoryNames.kebabName}-repository.port.ts`,
      type: "repository",
      owner: featureNames.kebabName,
      content: createRepositoryPortTs(repositoryNames.pascalName),
    },
    {
      path: `${root}/data/${repositoryNames.kebabName}.mapper.ts`,
      type: "repository",
      owner: featureNames.kebabName,
      content: createMapperTs(repositoryNames, plan.db),
    },
  ];

  if (plan.db === "mongo") {
    return [
      ...commonFiles,
      {
        path: `${root}/data/${repositoryNames.kebabName}.model.ts`,
        type: "repository",
        owner: featureNames.kebabName,
        content: createMongoModelTs(repositoryNames.pascalName),
      },
      {
        path: `${root}/data/${repositoryNames.kebabName}.repository.mongo.ts`,
        type: "repository",
        owner: featureNames.kebabName,
        content: createMongoRepositoryTs(repositoryNames),
      },
    ];
  }

  return [
    ...commonFiles,
    {
      path: `${root}/data/${repositoryNames.kebabName}.row.ts`,
      type: "repository",
      owner: featureNames.kebabName,
      content: createSqlRowTs(repositoryNames.pascalName),
    },
    {
      path: `${root}/data/${repositoryNames.pluralName}.schema.ts`,
      type: "repository",
      owner: featureNames.kebabName,
      content: createSqlSchemaTs(repositoryNames, plan.db),
    },
    {
      path: `${root}/data/${repositoryNames.kebabName}.repository.sql.ts`,
      type: "repository",
      owner: featureNames.kebabName,
      content: createSqlRepositoryTs(repositoryNames),
    },
  ];
}

function createRepositoryPortTs(className: string): string {
  return `import { ReadWriteRepository } from '@soapjs/soap/data';

export interface ${className}Record {
  id: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export type ${className}Repository = ReadWriteRepository<${className}Record, unknown>;
`;
}

function createMongoModelTs(className: string): string {
  return `import { Document } from 'mongodb';

export interface ${className}Model extends Document {
  id: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}
`;
}

function createSqlRowTs(className: string): string {
  return `export interface ${className}Row {
  id: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}
`;
}

function createMapperTs(names: ReturnType<typeof createNameVariants>, db: RepositoryDb): string {
  const persistenceName = db === "mongo" ? `${names.pascalName}Model` : `${names.pascalName}Row`;
  const persistenceImport =
    db === "mongo"
      ? `import { ${names.pascalName}Model } from './${names.kebabName}.model';`
      : `import { ${names.pascalName}Row } from './${names.kebabName}.row';`;

  return `import { Mapper } from '@soapjs/soap/data';
import { ${names.pascalName}Record } from '../application/ports/${names.kebabName}-repository.port';
${persistenceImport}

export const ${names.camelName}Mapper: Mapper<${names.pascalName}Record, ${persistenceName}> = {
  toEntity(model) {
    const { _id, ...record } = model as ${persistenceName} & { _id?: unknown };

    return {
      ...record,
      id: record.id || (_id ? String(_id) : ''),
    };
  },

  toModel(entity) {
    return {
      ...entity,
    } as ${persistenceName};
  },
};
`;
}

function createMongoRepositoryTs(names: ReturnType<typeof createNameVariants>): string {
  return `import { randomUUID } from 'crypto';
import {
  DatabaseContext,
  DatabaseSession,
  DatabaseSessionRegistry,
  ReadWriteRepository,
  TransactionScope,
} from '@soapjs/soap/data';
import { MongoSource } from '@soapjs/soap-mongo';
import { ${names.pascalName}Record } from '../application/ports/${names.kebabName}-repository.port';
import { ${names.camelName}Mapper } from './${names.kebabName}.mapper';
import { ${names.pascalName}Model } from './${names.kebabName}.model';

export class Mongo${names.pascalName}Repository extends ReadWriteRepository<${names.pascalName}Record, ${names.pascalName}Model> {
  constructor(source: MongoSource<${names.pascalName}Model>) {
    super(new DatabaseContext(source, ${names.camelName}Mapper, createRepositorySessions()));
  }
}

function createRepositorySessions(): DatabaseSessionRegistry {
  const sessions = new Map<string, DatabaseSession>();

  return {
    transactionScope: TransactionScope.getInstance(),
    createSession() {
      const session = createNoopSession();
      sessions.set(session.id, session);
      return session;
    },
    deleteSession(id: string) {
      sessions.delete(id);
    },
    getSession(id: string) {
      return sessions.get(id);
    },
    hasSession(id: string) {
      return sessions.has(id);
    },
  };
}

function createNoopSession(): DatabaseSession {
  return {
    id: randomUUID(),
    async end() {},
    async startTransaction() {},
    async commitTransaction() {},
    async rollbackTransaction() {},
  };
}
`;
}

function createSqlSchemaTs(names: ReturnType<typeof createNameVariants>, db: RepositoryDb): string {
  const tableName = names.pluralName.replace(/-/g, "_");
  const createdAtColumn = db === "mysql" ? "`createdAt`" : "\"createdAt\"";
  const updatedAtColumn = db === "mysql" ? "`updatedAt`" : "\"updatedAt\"";

  return `import { SqlDataSource } from '@soapjs/soap-sql';
import { ${names.pascalName}Row } from './${names.kebabName}.row';

export const ${names.constantName}_TABLE = '${tableName}';

export async function ensure${names.pascalName}Schema(source: SqlDataSource<${names.pascalName}Row>): Promise<void> {
  await source.query(\`
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id TEXT PRIMARY KEY,
      ${createdAtColumn} TEXT NOT NULL,
      ${updatedAtColumn} TEXT NOT NULL
    )
  \`);
}
`;
}

function createSqlRepositoryTs(names: ReturnType<typeof createNameVariants>): string {
  return `import { randomUUID } from 'crypto';
import {
  DatabaseContext,
  DatabaseSession,
  DatabaseSessionRegistry,
  ReadWriteRepository,
  TransactionScope,
} from '@soapjs/soap/data';
import { SqlDataSource } from '@soapjs/soap-sql';
import { ${names.pascalName}Record } from '../application/ports/${names.kebabName}-repository.port';
import { ${names.camelName}Mapper } from './${names.kebabName}.mapper';
import { ${names.pascalName}Row } from './${names.kebabName}.row';

export class Sql${names.pascalName}Repository extends ReadWriteRepository<${names.pascalName}Record, ${names.pascalName}Row> {
  constructor(source: SqlDataSource<${names.pascalName}Row>) {
    super(new DatabaseContext(source, ${names.camelName}Mapper, createRepositorySessions()));
  }
}

function createRepositorySessions(): DatabaseSessionRegistry {
  const sessions = new Map<string, DatabaseSession>();

  return {
    transactionScope: TransactionScope.getInstance(),
    createSession() {
      const session = createNoopSession();
      sessions.set(session.id, session);
      return session;
    },
    deleteSession(id: string) {
      sessions.delete(id);
    },
    getSession(id: string) {
      return sessions.get(id);
    },
    hasSession(id: string) {
      return sessions.has(id);
    },
  };
}

function createNoopSession(): DatabaseSession {
  return {
    id: randomUUID(),
    async end() {},
    async startTransaction() {},
    async commitTransaction() {},
    async rollbackTransaction() {},
  };
}
`;
}
