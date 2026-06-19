import path from "path";
import { PlannedFile } from "../../io/file-writer";
import { readFileHash } from "../../registry/registry.service";
import { SoapConfig } from "../../config/schemas/types";

export interface BrunoFileAnalysis {
  file: PlannedFile;
  exists: boolean;
  tracked: boolean;
  modified: boolean;
}

export interface BrunoGenerationAnalysis {
  routeCount: number;
  files: BrunoFileAnalysis[];
  existingCount: number;
  missingCount: number;
  modifiedCount: number;
}

export async function analyzeBrunoFiles(config: SoapConfig, files: PlannedFile[]): Promise<BrunoGenerationAnalysis> {
  const analyzedFiles = await Promise.all(files.map((file) => analyzeBrunoFile(config, file)));

  return {
    routeCount: config.registry.routes.length,
    files: analyzedFiles,
    existingCount: analyzedFiles.filter((entry) => entry.exists).length,
    missingCount: analyzedFiles.filter((entry) => !entry.exists).length,
    modifiedCount: analyzedFiles.filter((entry) => entry.modified).length,
  };
}

export function formatBrunoGenerationAnalysis(analysis: BrunoGenerationAnalysis): string {
  return [
    `Detected routes: ${analysis.routeCount}`,
    `Existing Bruno files: ${analysis.existingCount}`,
    `Missing Bruno files: ${analysis.missingCount}`,
    `Modified generated Bruno files: ${analysis.modifiedCount}`,
  ].join("\n");
}

export function selectMissingBrunoFiles(analysis: BrunoGenerationAnalysis): PlannedFile[] {
  return analysis.files
    .filter((entry) => !entry.exists)
    .map((entry) => entry.file);
}

export function selectUnmodifiedBrunoFiles(analysis: BrunoGenerationAnalysis): PlannedFile[] {
  return analysis.files
    .filter((entry) => !entry.modified)
    .map((entry) => entry.file);
}

async function analyzeBrunoFile(config: SoapConfig, file: PlannedFile): Promise<BrunoFileAnalysis> {
  const targetPath = path.join(config.root, file.path);
  const currentHash = await readFileHash(targetPath);
  const registryEntry = config.registry.generatedFiles.find((entry) => entry.path === file.path);

  return {
    file,
    exists: currentHash !== undefined,
    tracked: registryEntry !== undefined,
    modified: Boolean(currentHash && registryEntry && currentHash !== registryEntry.hash),
  };
}
