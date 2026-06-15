/** Maps diagram class names (e.g. aws-s3) to installed provider icon filenames. */
import type { InstallableIconPack } from "./IconPacks";

export interface CanonicalIconAlias {
  /** Short name used in diagrams, e.g. `aws-s3` → `s3`. */
  key: string;
  /** Manifest keys to try, in priority order. */
  match: string[];
}

const AWS_ALIASES: CanonicalIconAlias[] = [
  { key: "s3", match: ["s3", "res-simple-storage-bucket", "simple-storage"] },
  { key: "sqs", match: ["sqs", "simple-queue"] },
  { key: "sns", match: ["sns", "simple-notification"] },
  { key: "ecs", match: ["ecs", "elastic-container", "res-elastic-container"] },
  { key: "eks", match: ["eks", "elastic-kubernetes"] },
  { key: "iam", match: ["iam", "identity-and-access-management"] },
  { key: "kms", match: ["kms", "key-management"] },
  { key: "vpc", match: ["vpc", "virtual-private-cloud-vpc", "virtual-private-cloud"] },
  { key: "route53", match: ["route53", "route-53", "route"] },
  { key: "elb", match: ["elb", "elastic-load-balancing"] },
  { key: "apigateway", match: ["apigateway", "api-gateway"] },
  { key: "elasticbeanstalk", match: ["elasticbeanstalk", "elastic-beanstalk"] },
  { key: "stepfunctions", match: ["stepfunctions", "step-functions"] },
  { key: "secretsmanager", match: ["secretsmanager", "secrets-manager"] },
  { key: "eventbridge", match: ["eventbridge", "event-bridge"] },
  { key: "opensearch", match: ["opensearch", "open-search"] },
  { key: "cloudformation", match: ["cloudformation", "cloud-formation"] },
  { key: "xray", match: ["xray", "x-ray"] }
];

const GCP_ALIASES: CanonicalIconAlias[] = [
  { key: "cloudrun", match: ["cloudrun", "cloud-run"] },
  { key: "cloudstorage", match: ["cloudstorage", "cloud-storage"] },
  { key: "pubsub", match: ["pubsub", "pub-sub"] },
  { key: "bigquery", match: ["bigquery", "big-query"] },
  { key: "gke", match: ["gke", "kubernetes-engine"] },
  { key: "loadbalancing", match: ["loadbalancing", "load-balancing"] },
  { key: "vertexai", match: ["vertexai", "vertex-ai"] },
  { key: "memorystore", match: ["memorystore", "memory-store"] }
];

const AZURE_ALIASES: CanonicalIconAlias[] = [
  { key: "blobstorage", match: ["blobstorage", "blob-storage", "blob"] },
  { key: "cosmosdb", match: ["cosmosdb", "cosmos-db"] },
  { key: "servicebus", match: ["servicebus", "service-bus"] },
  { key: "appservice", match: ["appservice", "app-service"] },
  { key: "sqldb", match: ["sqldb", "sql-database", "sql-db"] },
  { key: "apim", match: ["apim", "api-management"] },
  { key: "eventgrid", match: ["eventgrid", "event-grid"] },
  { key: "eventhubs", match: ["eventhubs", "event-hubs"] },
  { key: "keyvault", match: ["keyvault", "key-vault"] },
  { key: "logicapps", match: ["logicapps", "logic-apps"] }
];

const CANONICAL_ALIASES: Record<InstallableIconPack, CanonicalIconAlias[]> = {
  aws: AWS_ALIASES,
  gcp: GCP_ALIASES,
  azure: AZURE_ALIASES
};

function compact(value: string): string {
  return value.replace(/-/g, "");
}

function iconPath(icons: Record<string, string>, key: string): string | undefined {
  return icons[key] ?? icons[compact(key)];
}

export function canonicalAliasesFor(pack: InstallableIconPack): CanonicalIconAlias[] {
  return CANONICAL_ALIASES[pack];
}

export function applyCanonicalAliases(pack: InstallableIconPack, icons: Record<string, string>): void {
  for (const alias of canonicalAliasesFor(pack)) {
    if (iconPath(icons, alias.key)) continue;
    for (const candidate of alias.match) {
      const path = iconPath(icons, candidate);
      if (path) {
        icons[alias.key] = path;
        const compactKey = compact(alias.key);
        if (compactKey !== alias.key) icons[compactKey] = path;
        break;
      }
    }
  }
}

export function resolveCanonicalIcon(pack: string, service: string, icons: Record<string, string>): string | undefined {
  const direct = iconPath(icons, service);
  if (direct) return direct;

  if (!isInstallableIconPack(pack)) return undefined;
  const alias = canonicalAliasesFor(pack).find((entry) => entry.key === service || compact(entry.key) === compact(service));
  if (!alias) return undefined;

  for (const candidate of alias.match) {
    const path = iconPath(icons, candidate);
    if (path) return path;
  }

  return undefined;
}

function isInstallableIconPack(value: string): value is InstallableIconPack {
  return value === "aws" || value === "gcp" || value === "azure";
}
