import type { ReportTemplate, ReportType } from "./template-types";

const registry = new Map<ReportType, ReportTemplate>();

export function registerTemplate(template: ReportTemplate): void {
  registry.set(template.type, template);
}

export function getTemplate(type: ReportType): ReportTemplate | undefined {
  return registry.get(type);
}

export function getAllTemplates(): ReportTemplate[] {
  return Array.from(registry.values());
}
