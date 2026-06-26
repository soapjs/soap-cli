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
  readOnly?: boolean;
  entity?: string;
  model?: string;
}

export function createRepositoryFiles(plan: AddRepositoryPlan): PlannedFile[] {
  const repositoryNames = createNameVariants(plan.name);
  const featureNames = createNameVariants(plan.feature);
  const domainRef = createDomainReference(repositoryNames, plan.entity);
  const persistenceRef = createPersistenceReference(repositoryNames, plan.db, plan.model);
  const root = path.posix.join(plan.featuresRoot, featureNames.kebabName);
  const commonFiles: PlannedFile[] = [
    {
      path: `${root}/application/ports/${repositoryNames.kebabName}-repository.port.ts`,
      type: "repository",
      owner: featureNames.kebabName,
      content: createRepositoryPortTs(repositoryNames.pascalName, Boolean(plan.readOnly), domainRef),
    },
    {
      path: `${root}/data/${repositoryNames.kebabName}.mapper.ts`,
      type: "repository",
      owner: featureNames.kebabName,
      content: createMapperTs(repositoryNames, domainRef, persistenceRef),
    },
  ];

  if (plan.db === "mongo") {
    const mongoFiles: PlannedFile[] = [
      ...commonFiles,
      {
        path: `${root}/data/${repositoryNames.kebabName}.repository.mongo.ts`,
        type: "repository",
        owner: featureNames.kebabName,
        content: createMongoRepositoryTs(repositoryNames, Boolean(plan.readOnly), domainRef, persistenceRef),
      },
    ];

    if (!persistenceRef.external) {
      mongoFiles.splice(2, 0, {
        path: `${root}/data/${repositoryNames.kebabName}.model.ts`,
        type: "repository",
        owner: featureNames.kebabName,
        content: createMongoModelTs(persistenceRef.typeName),
      });
    }

    return mongoFiles;
  }

  const sqlFiles: PlannedFile[] = [
    ...commonFiles,
    {
      path: `${root}/data/${repositoryNames.pluralName}.schema.ts`,
      type: "repository",
      owner: featureNames.kebabName,
      content: createSqlSchemaTs(repositoryNames, plan.db, persistenceRef),
    },
    {
      path: `${root}/data/${repositoryNames.kebabName}.repository.sql.ts`,
      type: "repository",
      owner: featureNames.kebabName,
      content: createSqlRepositoryTs(repositoryNames, Boolean(plan.readOnly), domainRef, persistenceRef),
    },
  ];

  if (!persistenceRef.external) {
    sqlFiles.splice(2, 0, {
      path: `${root}/data/${repositoryNames.kebabName}.row.ts`,
      type: "repository",
      owner: featureNames.kebabName,
      content: createSqlRowTs(persistenceRef.typeName),
    });
  }

  return sqlFiles;
}

interface DomainReference {
  typeName: string;
  portImport?: string;
  dataImport: string;
  inlineRecord: boolean;
}

interface PersistenceReference {
  typeName: string;
  dataImport: string;
  external: boolean;
}

function createDomainReference(names: ReturnType<typeof createNameVariants>, entity?: string): DomainReference {
  if (!entity) {
    return {
      typeName: `${names.pascalName}Record`,
      dataImport: `../application/ports/${names.kebabName}-repository.port`,
      inlineRecord: true,
    };
  }

  const entityNames = createNameVariants(entity);

  return {
    typeName: entityNames.pascalName,
    portImport: `../../domain/${entityNames.kebabName}.entity`,
    dataImport: `../domain/${entityNames.kebabName}.entity`,
    inlineRecord: false,
  };
}

function createPersistenceReference(
  names: ReturnType<typeof createNameVariants>,
  db: RepositoryDb,
  model?: string
): PersistenceReference {
  const typeName = model
    ? createNameVariants(model).pascalName
    : db === "mongo"
      ? `${names.pascalName}Model`
      : `${names.pascalName}Row`;
  const fileStem = model ? inferPersistenceFileStem(typeName) : names.kebabName;
  const fileSuffix = db === "mongo" ? "model" : "row";

  return {
    typeName,
    dataImport: `./${fileStem}.${fileSuffix}`,
    external: Boolean(model),
  };
}

function inferPersistenceFileStem(typeName: string): string {
  const baseName = typeName.replace(/(Document|Model|Row)$/u, "");

  return createNameVariants(baseName || typeName).kebabName;
}

function createRepositoryPortTs(className: string, readOnly: boolean, domainRef: DomainReference): string {
  const repositoryType = readOnly ? "ReadRepository" : "ReadWriteRepository";
  const imports = [`import { ${repositoryType} } from '@soapjs/soap/data';`];

  if (domainRef.portImport) {
    imports.push(`import type { ${domainRef.typeName} } from '${domainRef.portImport}';`);
  }

  const inlineRecord = domainRef.inlineRecord
    ? `export interface ${domainRef.typeName} {
  id: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}
`
    : "";

  return `${imports.join("\n")}

${inlineRecord}export type ${className}Repository = ${repositoryType}<${domainRef.typeName}, unknown>;
`;
}

function createMongoModelTs(typeName: string): string {
  return `import { Document } from 'mongodb';

export interface ${typeName} extends Document {
  id: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}
`;
}

function createSqlRowTs(typeName: string): string {
  return `export interface ${typeName} {
  id: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}
`;
}

function createMapperTs(
  names: ReturnType<typeof createNameVariants>,
  domainRef: DomainReference,
  persistenceRef: PersistenceReference
): string {
  const domainImport = domainRef.inlineRecord
    ? `import type { ${domainRef.typeName} } from '${domainRef.dataImport}';`
    : `import { ${domainRef.typeName} } from '${domainRef.dataImport}';`;
  const toEntity = domainRef.inlineRecord
    ? `      return {
        ...record,
        id: record.id || (_id ? String(_id) : ''),
      } as ${domainRef.typeName};`
    : `      return ${domainRef.typeName}.rehydrate({
        ...record,
        id: record.id || (_id ? String(_id) : ''),
      });`;
  const toModel = domainRef.inlineRecord
    ? `      return {
        ...entity,
      } as ${persistenceRef.typeName};`
    : `      return {
        ...entity.props,
      } as ${persistenceRef.typeName};`;

  return `import { Mapper } from '@soapjs/soap/data';
${domainImport}
import type { ${persistenceRef.typeName} } from '${persistenceRef.dataImport}';

export type ${names.pascalName}Mapper = Mapper<${domainRef.typeName}, ${persistenceRef.typeName}> & {
  toEntity(model: ${persistenceRef.typeName}): ${domainRef.typeName};
  toModel(entity: ${domainRef.typeName}): ${persistenceRef.typeName};
};

export function create${names.pascalName}Mapper(): ${names.pascalName}Mapper {
  return {
    toEntity(model) {
      const { _id, ...record } = model as ${persistenceRef.typeName} & { _id?: unknown };

${toEntity}
    },

    toModel(entity) {
${toModel}
    },
  };
}
`;
}

function createMongoRepositoryTs(
  names: ReturnType<typeof createNameVariants>,
  readOnly: boolean,
  domainRef: DomainReference,
  persistenceRef: PersistenceReference
): string {
  const repositoryType = readOnly ? "ReadRepository" : "ReadWriteRepository";

  return `import {
  DatabaseContext,
  DatabaseSessionRegistry,
  ${repositoryType},
} from '@soapjs/soap/data';
import { MongoSource } from '@soapjs/soap-mongo';
import type { ${domainRef.typeName} } from '${domainRef.dataImport}';
import type { ${names.pascalName}Mapper } from './${names.kebabName}.mapper';
import type { ${persistenceRef.typeName} } from '${persistenceRef.dataImport}';

export class Mongo${names.pascalName}Repository extends ${repositoryType}<${domainRef.typeName}, ${persistenceRef.typeName}> {
  constructor(
    source: MongoSource<${persistenceRef.typeName}>,
    mapper: ${names.pascalName}Mapper,
    sessions: DatabaseSessionRegistry
  ) {
    super(new DatabaseContext(source, mapper, sessions));
  }
}
`;
}

function createSqlSchemaTs(
  names: ReturnType<typeof createNameVariants>,
  db: RepositoryDb,
  persistenceRef: PersistenceReference
): string {
  const tableName = names.pluralName.replace(/-/g, "_");
  const createdAtColumn = db === "mysql" ? "`createdAt`" : "\"createdAt\"";
  const updatedAtColumn = db === "mysql" ? "`updatedAt`" : "\"updatedAt\"";

  return `import { SqlDataSource } from '@soapjs/soap-sql';
import type { ${persistenceRef.typeName} } from '${persistenceRef.dataImport}';

export const ${names.constantName}_TABLE = '${tableName}';

export async function ensure${names.pascalName}Schema(source: SqlDataSource<${persistenceRef.typeName}>): Promise<void> {
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

function createSqlRepositoryTs(
  names: ReturnType<typeof createNameVariants>,
  readOnly: boolean,
  domainRef: DomainReference,
  persistenceRef: PersistenceReference
): string {
  const repositoryType = readOnly ? "ReadRepository" : "ReadWriteRepository";

  return `import {
  DatabaseContext,
  DatabaseSessionRegistry,
  ${repositoryType},
} from '@soapjs/soap/data';
import { SqlDataSource } from '@soapjs/soap-sql';
import type { ${domainRef.typeName} } from '${domainRef.dataImport}';
import type { ${names.pascalName}Mapper } from './${names.kebabName}.mapper';
import type { ${persistenceRef.typeName} } from '${persistenceRef.dataImport}';

export class Sql${names.pascalName}Repository extends ${repositoryType}<${domainRef.typeName}, ${persistenceRef.typeName}> {
  constructor(
    source: SqlDataSource<${persistenceRef.typeName}>,
    mapper: ${names.pascalName}Mapper,
    sessions: DatabaseSessionRegistry
  ) {
    super(new DatabaseContext(source, mapper, sessions));
  }
}
`;
}
