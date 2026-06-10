export class MmdExporter {
  export(source: string): string {
    return source
      .split(/\r?\n/)
      .filter((line) => !/^\s*%%diagra:/i.test(line))
      .map((line) => line.replace(/:::\s*(aws|gcp|azure|generic)-[A-Za-z0-9_-]+/g, ""))
      .join("\n")
      .trim();
  }
}
