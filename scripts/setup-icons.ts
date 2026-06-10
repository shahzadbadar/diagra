import AdmZip from "adm-zip";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

type Provider = "aws" | "gcp" | "azure";
type IconKind = "api" | "app" | "auth" | "cdn" | "cloud" | "compute" | "container" | "database" | "event" | "gateway" | "network" | "queue" | "security" | "storage";

interface IconSpec {
  key: string;
  filename: string;
  label: string;
  abbr: string;
  kind: IconKind;
  aliases?: string[];
  sourceHints?: string[];
}

const ROOT = process.cwd();
const ICON_ROOT = path.join(ROOT, "packages", "icons");

const COLORS: Record<Provider, string> = {
  aws: "#FF9900",
  gcp: "#4285F4",
  azure: "#0078D4"
};

const AWS_ICONS: IconSpec[] = [
  { key: "lambda", filename: "lambda.svg", label: "AWS Lambda", abbr: "λ", kind: "compute", sourceHints: ["lambda"] },
  { key: "s3", filename: "s3.svg", label: "Amazon S3", abbr: "S3", kind: "storage", sourceHints: ["simple-storage-service", "s3"] },
  { key: "dynamodb", filename: "dynamodb.svg", label: "Amazon DynamoDB", abbr: "DB", kind: "database", sourceHints: ["dynamodb"] },
  { key: "apigateway", filename: "apigateway.svg", label: "Amazon API Gateway", abbr: "API", kind: "api", sourceHints: ["api-gateway"] },
  { key: "ec2", filename: "ec2.svg", label: "Amazon EC2", abbr: "EC2", kind: "compute", sourceHints: ["ec2"] },
  { key: "rds", filename: "rds.svg", label: "Amazon RDS", abbr: "RDS", kind: "database", sourceHints: ["rds"] },
  { key: "sqs", filename: "sqs.svg", label: "Amazon SQS", abbr: "SQS", kind: "queue", sourceHints: ["simple-queue-service", "sqs"] },
  { key: "sns", filename: "sns.svg", label: "Amazon SNS", abbr: "SNS", kind: "event", sourceHints: ["simple-notification-service", "sns"] },
  { key: "cloudfront", filename: "cloudfront.svg", label: "Amazon CloudFront", abbr: "CF", kind: "cdn", sourceHints: ["cloudfront"] },
  { key: "cognito", filename: "cognito.svg", label: "Amazon Cognito", abbr: "ID", kind: "auth", sourceHints: ["cognito"] },
  { key: "ecs", filename: "ecs.svg", label: "Amazon ECS", abbr: "ECS", kind: "container", sourceHints: ["elastic-container-service", "ecs"] },
  { key: "eks", filename: "eks.svg", label: "Amazon EKS", abbr: "EKS", kind: "container", sourceHints: ["elastic-kubernetes-service", "eks"] },
  { key: "fargate", filename: "fargate.svg", label: "AWS Fargate", abbr: "FG", kind: "container", sourceHints: ["fargate"] },
  { key: "elasticbeanstalk", filename: "elasticbeanstalk.svg", label: "AWS Elastic Beanstalk", abbr: "EB", kind: "app", sourceHints: ["elastic-beanstalk"] },
  { key: "vpc", filename: "vpc.svg", label: "Amazon VPC", abbr: "VPC", kind: "network", sourceHints: ["vpc"] },
  { key: "cloudwatch", filename: "cloudwatch.svg", label: "Amazon CloudWatch", abbr: "CW", kind: "event", sourceHints: ["cloudwatch"] },
  { key: "iam", filename: "iam.svg", label: "AWS IAM", abbr: "IAM", kind: "security", sourceHints: ["identity-and-access-management", "iam"] },
  { key: "route53", filename: "route53.svg", label: "Amazon Route 53", abbr: "R53", kind: "network", sourceHints: ["route-53", "route53"] },
  { key: "elb", filename: "elb.svg", label: "Elastic Load Balancing", abbr: "ELB", kind: "gateway", sourceHints: ["elastic-load-balancing", "elb"] },
  { key: "stepfunctions", filename: "stepfunctions.svg", label: "AWS Step Functions", abbr: "SF", kind: "event", sourceHints: ["step-functions"] },
  { key: "secretsmanager", filename: "secretsmanager.svg", label: "AWS Secrets Manager", abbr: "SM", kind: "security", sourceHints: ["secrets-manager"] },
  { key: "eventbridge", filename: "eventbridge.svg", label: "Amazon EventBridge", abbr: "EV", kind: "event", sourceHints: ["eventbridge"] },
  { key: "kinesis", filename: "kinesis.svg", label: "Amazon Kinesis", abbr: "KIN", kind: "event", sourceHints: ["kinesis"] },
  { key: "redshift", filename: "redshift.svg", label: "Amazon Redshift", abbr: "RS", kind: "database", sourceHints: ["redshift"] },
  { key: "opensearch", filename: "opensearch.svg", label: "Amazon OpenSearch", abbr: "OS", kind: "database", sourceHints: ["opensearch"] },
  { key: "sagemaker", filename: "sagemaker.svg", label: "Amazon SageMaker", abbr: "SM", kind: "compute", sourceHints: ["sagemaker"] },
  { key: "glue", filename: "glue.svg", label: "AWS Glue", abbr: "GL", kind: "event", sourceHints: ["glue"] },
  { key: "athena", filename: "athena.svg", label: "Amazon Athena", abbr: "AT", kind: "database", sourceHints: ["athena"] },
  { key: "cloudformation", filename: "cloudformation.svg", label: "AWS CloudFormation", abbr: "CFN", kind: "app", sourceHints: ["cloudformation"] },
  { key: "waf", filename: "waf.svg", label: "AWS WAF", abbr: "WAF", kind: "security", sourceHints: ["waf"] },
  { key: "kms", filename: "kms.svg", label: "AWS KMS", abbr: "KMS", kind: "security", sourceHints: ["key-management-service", "kms"] }
];

const GCP_ICONS: IconSpec[] = [
  { key: "bigquery", filename: "bigquery.svg", label: "BigQuery", abbr: "BQ", kind: "database" },
  { key: "cloudrun", filename: "cloudrun.svg", label: "Cloud Run", abbr: "RUN", kind: "container" },
  { key: "pubsub", filename: "pubsub.svg", label: "Pub/Sub", abbr: "PS", kind: "event" },
  { key: "cloudstorage", filename: "cloudstorage.svg", label: "Cloud Storage", abbr: "CS", kind: "storage" },
  { key: "functions", filename: "functions.svg", label: "Cloud Functions", abbr: "FN", kind: "compute" },
  { key: "compute", filename: "compute.svg", label: "Compute Engine", abbr: "CE", kind: "compute" },
  { key: "gke", filename: "gke.svg", label: "Google Kubernetes Engine", abbr: "GKE", kind: "container" },
  { key: "sql", filename: "sql.svg", label: "Cloud SQL", abbr: "SQL", kind: "database" },
  { key: "firestore", filename: "firestore.svg", label: "Firestore", abbr: "FS", kind: "database" },
  { key: "spanner", filename: "spanner.svg", label: "Spanner", abbr: "SP", kind: "database" },
  { key: "loadbalancing", filename: "loadbalancing.svg", label: "Cloud Load Balancing", abbr: "LB", kind: "gateway" },
  { key: "iam", filename: "iam.svg", label: "Cloud IAM", abbr: "IAM", kind: "security" },
  { key: "monitoring", filename: "monitoring.svg", label: "Cloud Monitoring", abbr: "MON", kind: "event" },
  { key: "logging", filename: "logging.svg", label: "Cloud Logging", abbr: "LOG", kind: "event" },
  { key: "scheduler", filename: "scheduler.svg", label: "Cloud Scheduler", abbr: "SCH", kind: "event" },
  { key: "tasks", filename: "tasks.svg", label: "Cloud Tasks", abbr: "TSK", kind: "queue" },
  { key: "memorystore", filename: "memorystore.svg", label: "Memorystore", abbr: "MEM", kind: "database" },
  { key: "dataflow", filename: "dataflow.svg", label: "Dataflow", abbr: "DF", kind: "event" },
  { key: "dataproc", filename: "dataproc.svg", label: "Dataproc", abbr: "DP", kind: "compute" },
  { key: "vertexai", filename: "vertexai.svg", label: "Vertex AI", abbr: "AI", kind: "compute" }
];

const AZURE_ICONS: IconSpec[] = [
  { key: "functions", filename: "functions.svg", label: "Azure Functions", abbr: "FN", kind: "compute" },
  { key: "cosmosdb", filename: "cosmosdb.svg", label: "Azure Cosmos DB", abbr: "CDB", kind: "database" },
  { key: "blob", filename: "blob.svg", label: "Azure Blob Storage", abbr: "BLB", kind: "storage", aliases: ["blobstorage"] },
  { key: "blobstorage", filename: "blobstorage.svg", label: "Azure Blob Storage", abbr: "BLB", kind: "storage" },
  { key: "servicebus", filename: "servicebus.svg", label: "Azure Service Bus", abbr: "SB", kind: "queue" },
  { key: "appservice", filename: "appservice.svg", label: "Azure App Service", abbr: "APP", kind: "app" },
  { key: "aks", filename: "aks.svg", label: "Azure Kubernetes Service", abbr: "AKS", kind: "container" },
  { key: "vm", filename: "vm.svg", label: "Azure Virtual Machines", abbr: "VM", kind: "compute" },
  { key: "sqldb", filename: "sqldb.svg", label: "Azure SQL Database", abbr: "SQL", kind: "database" },
  { key: "storage", filename: "storage.svg", label: "Azure Storage", abbr: "ST", kind: "storage" },
  { key: "apim", filename: "apim.svg", label: "Azure API Management", abbr: "API", kind: "api" },
  { key: "eventgrid", filename: "eventgrid.svg", label: "Azure Event Grid", abbr: "EG", kind: "event" },
  { key: "eventhubs", filename: "eventhubs.svg", label: "Azure Event Hubs", abbr: "EH", kind: "event" },
  { key: "keyvault", filename: "keyvault.svg", label: "Azure Key Vault", abbr: "KV", kind: "security" },
  { key: "monitor", filename: "monitor.svg", label: "Azure Monitor", abbr: "MON", kind: "event" },
  { key: "entra", filename: "entra.svg", label: "Microsoft Entra ID", abbr: "ID", kind: "auth" },
  { key: "frontdoor", filename: "frontdoor.svg", label: "Azure Front Door", abbr: "FD", kind: "cdn" },
  { key: "cdn", filename: "cdn.svg", label: "Azure CDN", abbr: "CDN", kind: "cdn" },
  { key: "redis", filename: "redis.svg", label: "Azure Cache for Redis", abbr: "RED", kind: "database" },
  { key: "logicapps", filename: "logicapps.svg", label: "Azure Logic Apps", abbr: "LA", kind: "event" }
];

const AWS_ZIP_URLS = [
  "https://d1.awsstatic.com/webteam/architecture-icons/q1-2025/Asset-Package_02072025.6f3d8ab6aa131f30f89f7eb5f92803f45b147328.zip",
  "https://d1.awsstatic.com/webteam/architecture-icons/q4-2024/Asset-Package_12062024.7d6e9c4c6986f069a47c911de722a9c908782f99.zip",
  "https://github.com/awslabs/aws-icons-for-plantuml/archive/refs/heads/main.zip"
];

async function main(): Promise<void> {
  const awsZip = await tryDownloadAwsZip();
  await writeProvider("aws", AWS_ICONS, awsZip);
  await writeProvider("gcp", GCP_ICONS);
  await writeProvider("azure", AZURE_ICONS);
  console.log("Icon setup complete: AWS, GCP, and Azure manifests and SVG files are ready.");
}

async function writeProvider(provider: Provider, specs: IconSpec[], awsZip?: AdmZip): Promise<void> {
  const providerDir = path.join(ICON_ROOT, provider);
  const svgDir = path.join(providerDir, "svg");
  await mkdir(svgDir, { recursive: true });

  const manifest: { prefix: Provider; icons: Record<string, string> } = { prefix: provider, icons: {} };

  for (const spec of specs) {
    const targetPath = path.join(svgDir, spec.filename);
    const fromZip = provider === "aws" && awsZip ? findAwsSvg(awsZip, spec) : undefined;
    const svg = fromZip ?? generatedIcon(provider, spec);
    await writeFile(targetPath, svg, "utf8");
    manifest.icons[spec.key] = `svg/${spec.filename}`;
    for (const alias of spec.aliases ?? []) manifest.icons[alias] = `svg/${spec.filename}`;
  }

  await writeFile(path.join(providerDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function tryDownloadAwsZip(): Promise<AdmZip | undefined> {
  if (process.env.DIAGRA_SKIP_ICON_DOWNLOAD === "1") return undefined;
  for (const url of AWS_ZIP_URLS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) continue;
      const bytes = Buffer.from(await response.arrayBuffer());
      return new AdmZip(bytes);
    } catch {
      continue;
    } finally {
      clearTimeout(timeout);
    }
  }
  return undefined;
}

function findAwsSvg(zip: AdmZip, spec: IconSpec): string | undefined {
  const hints = [spec.key, spec.filename.replace(/\.svg$/, ""), ...(spec.sourceHints ?? [])].map(normalize);
  const entries = zip.getEntries().filter((entry) => !entry.isDirectory && entry.entryName.toLowerCase().endsWith(".svg"));
  const matched = entries.find((entry) => {
    const name = normalize(path.basename(entry.entryName));
    const fullPath = normalize(entry.entryName);
    return hints.some((hint) => name.includes(hint) || fullPath.includes(hint));
  });
  if (!matched) return undefined;
  const svg = matched.getData().toString("utf8");
  return sanitizeSvg(svg, spec.label);
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function sanitizeSvg(svg: string, label: string): string {
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/i);
  const inner = svg
    .replace(/<\?xml[\s\S]*?\?>/g, "")
    .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
    .replace(/<svg\b[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "")
    .trim();
  return `<svg viewBox="${viewBoxMatch?.[1] ?? "0 0 32 32"}" role="img" aria-label="${escapeXml(label)}">${inner}</svg>`;
}

function generatedIcon(provider: Provider, spec: IconSpec): string {
  const color = COLORS[provider];
  const fg = "#FFFFFF";
  const detail = iconDetail(spec.kind, color);
  const fontSize = spec.abbr.length <= 2 ? 9 : 7;
  return `<svg viewBox="0 0 32 32" role="img" aria-label="${escapeXml(spec.label)}">
  ${baseShape(provider, color)}
  ${detail}
  <text x="16" y="20.4" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" fill="${fg}">${escapeXml(spec.abbr)}</text>
</svg>`;
}

function baseShape(provider: Provider, color: string): string {
  if (provider === "aws") return `<path d="M16 2.8 27.6 9.4v13.2L16 29.2 4.4 22.6V9.4L16 2.8Z" fill="${color}"/>`;
  if (provider === "gcp") return `<path d="M9.5 25.8h13.3a6.1 6.1 0 0 0 .8-12.1 8.4 8.4 0 0 0-16.1-1.9A7.2 7.2 0 0 0 9.5 25.8Z" fill="${color}"/>`;
  return `<rect x="4" y="4" width="24" height="24" rx="5" fill="${color}"/>`;
}

function iconDetail(kind: IconKind, color: string): string {
  const dim = lighten(color, 0.28);
  const stroke = "#FFFFFF";
  switch (kind) {
    case "api":
      return `<path d="M7.5 11h17v10h-17z" fill="${dim}" opacity="0.9"/><path d="M11 16h10" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round"/>`;
    case "auth":
      return `<path d="M16 7.2 23 10v5.2c0 4.2-2.6 7.6-7 9.6-4.4-2-7-5.4-7-9.6V10l7-2.8Z" fill="${dim}" opacity="0.95"/>`;
    case "cdn":
      return `<circle cx="16" cy="16" r="8.5" fill="${dim}" opacity="0.9"/><path d="M8 16h16M16 8c2 2.4 3 5 3 8s-1 5.6-3 8M16 8c-2 2.4-3 5-3 8s1 5.6 3 8" stroke="${stroke}" stroke-width="1.1" fill="none"/>`;
    case "cloud":
      return `<path d="M10 21.5h13a4.5 4.5 0 0 0 0-9 6.7 6.7 0 0 0-12.7-1.2A5.1 5.1 0 0 0 10 21.5Z" fill="${dim}" opacity="0.95"/>`;
    case "compute":
      return `<rect x="8" y="8" width="16" height="16" rx="3" fill="${dim}" opacity="0.95"/><path d="M11 6v4M16 6v4M21 6v4M11 22v4M16 22v4M21 22v4" stroke="${stroke}" stroke-width="1.1"/>`;
    case "container":
      return `<path d="M8 10h16v12H8z" fill="${dim}" opacity="0.95"/><path d="M11 13h3M16 13h3M21 13h2M11 17h3M16 17h3M21 17h2" stroke="${stroke}" stroke-width="1.2" stroke-linecap="round"/>`;
    case "database":
      return `<ellipse cx="16" cy="9" rx="8.5" ry="3.4" fill="${dim}"/><path d="M7.5 9v12c0 1.9 3.8 3.4 8.5 3.4s8.5-1.5 8.5-3.4V9" fill="${dim}"/><path d="M7.5 15c0 1.9 3.8 3.4 8.5 3.4s8.5-1.5 8.5-3.4" stroke="${stroke}" stroke-width="1.2" fill="none"/>`;
    case "event":
      return `<path d="M16 6.8 25.2 16 16 25.2 6.8 16 16 6.8Z" fill="${dim}" opacity="0.95"/><path d="m13 11 6 5-6 5" stroke="${stroke}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    case "gateway":
      return `<path d="M7 12h18v8H7z" fill="${dim}" opacity="0.95"/><path d="M10 16h12M18 12l4 4-4 4" stroke="${stroke}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    case "network":
      return `<circle cx="10" cy="11" r="3" fill="${dim}"/><circle cx="22" cy="11" r="3" fill="${dim}"/><circle cx="16" cy="22" r="3" fill="${dim}"/><path d="M12.5 12.5 15 19M19.5 12.5 17 19M13 11h6" stroke="${stroke}" stroke-width="1.3"/>`;
    case "queue":
      return `<rect x="8" y="8" width="16" height="4.5" rx="2" fill="${dim}"/><rect x="8" y="14" width="16" height="4.5" rx="2" fill="${dim}"/><rect x="8" y="20" width="16" height="4.5" rx="2" fill="${dim}"/>`;
    case "security":
      return `<path d="M16 7 23 10v5.6c0 4-2.7 7-7 9.4-4.3-2.4-7-5.4-7-9.4V10l7-3Z" fill="${dim}" opacity="0.95"/><path d="M13 16.5 15.2 19 20 13.5" stroke="${stroke}" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    case "storage":
      return `<path d="M16 6 25 11v10l-9 5-9-5V11l9-5Z" fill="${dim}" opacity="0.95"/><path d="M10 13h12M10 18h12" stroke="${stroke}" stroke-width="1.4" stroke-linecap="round"/>`;
    default:
      return `<circle cx="16" cy="16" r="9" fill="${dim}" opacity="0.9"/>`;
  }
}

function lighten(hex: string, amount: number): string {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) + (255 - ((n >> 16) & 255)) * amount));
  const g = Math.min(255, Math.round(((n >> 8) & 255) + (255 - ((n >> 8) & 255)) * amount));
  const b = Math.min(255, Math.round((n & 255) + (255 - (n & 255)) * amount));
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
