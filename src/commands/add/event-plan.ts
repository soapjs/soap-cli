import path from "path";
import { PlannedFile } from "../../io/file-writer";
import { createNameVariants } from "../../templates/naming";

export interface AddEventPlan {
  name: string;
  feature: string;
  architecture: "regular" | "cqrs";
  featuresRoot: string;
}

export function createEventFiles(plan: AddEventPlan): PlannedFile[] {
  const eventNames = createNameVariants(plan.name);
  const featureNames = createNameVariants(plan.feature);
  const root = path.posix.join(plan.featuresRoot, featureNames.kebabName);
  const files: PlannedFile[] = [
    {
      path: `${root}/domain/events/${eventNames.kebabName}.event.ts`,
      type: "resource",
      owner: featureNames.kebabName,
      content: createEventTs(eventNames.pascalName, eventNames.kebabName),
    },
  ];

  if (plan.architecture === "cqrs") {
    files.push({
      path: `${root}/api/events/${eventNames.kebabName}.handler.ts`,
      type: "resource",
      owner: featureNames.kebabName,
      content: createEventHandlerTs(eventNames.pascalName, eventNames.kebabName),
    });
  }

  return files;
}

function createEventTs(className: string, eventName: string): string {
  return `import { BaseDomainEvent } from '../../../../common/events/domain-event';

export interface ${className}Data {
  [key: string]: unknown;
}

export class ${className}Event extends BaseDomainEvent<${className}Data> {
  static readonly type = '${eventName}';

  constructor(aggregateId: string, data: ${className}Data = {}, version = 1) {
    super(${className}Event.type, aggregateId, data, version);
  }
}
`;
}

function createEventHandlerTs(className: string, eventName: string): string {
  return `import { EventHandler } from '@soapjs/soap-express/build/decorators/event';
import { ${className}Event } from '../../domain/events/${eventName}.event';

@EventHandler(${className}Event)
export class ${className}Handler {
  async handle(event: ${className}Event): Promise<void> {
    void event;
  }
}
`;
}
