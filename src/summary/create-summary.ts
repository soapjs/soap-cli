import { ProjectPlan } from "../commands/create/project-plan";

export function formatCreateSummary(plan: ProjectPlan): string {
  return [
    `Project: ${plan.name}`,
    `Framework: ${plan.framework}`,
    `Architecture: ${plan.architecture}`,
    `Controller layout: ${plan.controllerLayout}`,
    `Databases: ${formatList(plan.capabilities.databases)}`,
    `Auth: ${formatList(plan.capabilities.auth)}`,
    `Messaging: ${formatList(plan.capabilities.messaging)}`,
    `Realtime: ${formatList(plan.capabilities.realtime)}`,
    `Telemetry: ${formatList(plan.capabilities.telemetry)}`,
    `Docs: ${formatList(plan.capabilities.docs)}`,
    `Contracts: ${formatList(plan.capabilities.contracts)}`,
    `API client: ${formatList(plan.capabilities.apiClient)}`,
    `Zones: ${formatList(plan.zones)}`,
    `Package manager: ${plan.packageManager}`,
  ].join("\n");
}

function formatList(values: string[]): string {
  return values.length > 0 ? values.join(", ") : "none";
}
