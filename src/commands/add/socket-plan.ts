import fs from "fs/promises";
import path from "path";
import { AuthCapability } from "../../config/schemas/types";
import { CliError } from "../../core/errors";
import { PlannedFile } from "../../io/file-writer";
import { createNameVariants } from "../../templates/naming";

export interface AddSocketPlan {
  name: string;
  feature: string;
  auth: "none" | AuthCapability;
  featuresRoot: string;
}

export async function createSocketFiles(root: string, plan: AddSocketPlan): Promise<PlannedFile[]> {
  const socketNames = createNameVariants(plan.name);
  const featureNames = createNameVariants(plan.feature);
  const featureRoot = path.posix.join(plan.featuresRoot, featureNames.kebabName);
  const socketPath = `${featureRoot}/api/sockets/${socketNames.kebabName}.socket.ts`;

  return [
    {
      path: socketPath,
      type: "resource",
      owner: featureNames.kebabName,
      content: createSocketTs(`${socketNames.pascalName}Socket`, `${socketNames.camelName}Socket`, socketNames.kebabName, plan.auth),
    },
    await createSocketsConfigFile(root, {
      className: `${socketNames.pascalName}Socket`,
      exportName: `${socketNames.camelName}Socket`,
      importPath: `../${featureRoot.replace(/^src\//, "")}/api/sockets/${socketNames.kebabName}.socket`,
    }),
  ];
}

function createSocketTs(className: string, exportName: string, eventName: string, auth: "none" | AuthCapability): string {
  const authComment = auth === "none" ? "" : "\n    // TODO: validate socket auth before handling this message.\n";

  return `import { SocketMessage, SocketServer } from '@soapjs/soap-socket';
import { AppSocketHandler } from '../../../../common/sockets/socket.setup';

export class ${className} implements AppSocketHandler {
  readonly event = '${eventName}';

  async handle(clientId: string, message: SocketMessage, server: SocketServer): Promise<void> {${authComment}
    server.sendToClient(clientId, {
      type: '${eventName}:ack',
      payload: {
        received: true,
        input: message.payload,
      },
    });
  }
}

export const ${exportName} = new ${className}();
`;
}

async function createSocketsConfigFile(
  root: string,
  socket: {
    className: string;
    exportName: string;
    importPath: string;
  }
): Promise<PlannedFile> {
  const configPath = "src/config/sockets.ts";
  const absolutePath = path.join(root, configPath);
  let current: string;

  try {
    current = await fs.readFile(absolutePath, "utf8");
  } catch {
    throw new CliError("WebSocket config is missing. Create the project with `--realtime ws` first.");
  }

  if (current.includes(` ${socket.exportName} `) || current.includes(`{ ${socket.exportName} }`)) {
    throw new CliError(`Socket handler "${socket.exportName}" is already registered.`);
  }

  const importLine = `import { ${socket.exportName} } from '${socket.importPath}';`;
  const withImport = `${importLine}\n${current}`;
  const content = withImport.replace(
    /export const socketHandlers: AppSocketHandler\[] = \[([\s\S]*?)\];/,
    (_match, body: string) => {
      const entries = body
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      entries.push(`  ${socket.exportName},`);

      return `export const socketHandlers: AppSocketHandler[] = [\n${entries.join("\n")}\n];`;
    }
  );

  return {
    path: configPath,
    type: "config",
    content,
  };
}
