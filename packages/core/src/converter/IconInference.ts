import type { AnimationName, IconPackName, ThemeName } from "../types";

export type IconInferencePack = "generic" | "aws" | "azure" | "gcp";

export interface IconInferenceRule {
  pattern: RegExp;
  icon: string;
}

/** Keyword rules for guessing icons from node labels (no AI). First match wins. */
const GENERIC_RULES: IconInferenceRule[] = [
  { pattern: /\b(web and mobile|browser|frontend|website)\b/i, icon: "generic-browser" },
  { pattern: /\b(eventbridge|event bus|event grid|pubsub|pub\/sub|sns|topic|notification)\b/i, icon: "generic-event" },
  { pattern: /\b(dead letter|dlq|queue|sqs|fifo|message queue|service bus)\b/i, icon: "generic-queue" },
  { pattern: /\b(database|dynamodb|dynamo|rds|postgres|mysql|sql|cosmos|table|firestore|bigquery|redshift|spanner)\b/i, icon: "generic-database" },
  { pattern: /\b(api gateway|apigateway|api management|rest api|graphql|endpoint)\b/i, icon: "generic-api" },
  { pattern: /\b(cloudfront|cdn|content delivery)\b/i, icon: "generic-cloud" },
  { pattern: /\b(s3|storage|bucket|blob|file storage|artifact|data lake)\b/i, icon: "generic-storage" },
  { pattern: /\b(cloudwatch|monitor|observability|metrics|logging|trace|x-ray|xray|alarm)\b/i, icon: "generic-monitoring" },
  { pattern: /\b(cache|redis|elasticache|memcached)\b/i, icon: "generic-cache" },
  { pattern: /\b(auth|cognito|iam|security|waf|kms|key vault|entra|oauth)\b/i, icon: "generic-security" },
  { pattern: /\b(agent|orchestrator|coordinator)\b/i, icon: "generic-agent" },
  { pattern: /\b(ai|ml|sagemaker|vertex|openai|llm|model training|inference)\b/i, icon: "generic-ai" },
  { pattern: /\b(stream|kinesis|kafka|event hub)\b/i, icon: "generic-stream" },
  { pattern: /\b(workflow|step function|pipeline|glue|dataflow|etl)\b/i, icon: "generic-workflow" },
  { pattern: /\b(lambda|function|worker|consumer|microservice|service|compute|ec2|fargate|container|ecs|eks)\b/i, icon: "generic-server" },
  { pattern: /\b(user|users|customer|client|person|human)\b/i, icon: "generic-user" },
  { pattern: /\b(mobile|ios|android|native app)\b/i, icon: "generic-mobile" },
  { pattern: /\b(web|ui|portal)\b/i, icon: "generic-web" }
];

const AWS_RULES: IconInferenceRule[] = [
  { pattern: /\blambda\b/i, icon: "aws-lambda" },
  { pattern: /\b(api gateway|apigateway)\b/i, icon: "aws-apigateway" },
  { pattern: /\bdynamodb\b/i, icon: "aws-dynamodb" },
  { pattern: /\b(s3|simple storage)\b/i, icon: "aws-s3" },
  { pattern: /\bsqs\b/i, icon: "aws-sqs" },
  { pattern: /\bsns\b/i, icon: "aws-sns" },
  { pattern: /\beventbridge\b/i, icon: "aws-eventbridge" },
  { pattern: /\bcloudwatch\b/i, icon: "aws-cloudwatch" },
  { pattern: /\bcognito\b/i, icon: "aws-cognito" },
  { pattern: /\bcloudfront\b/i, icon: "aws-cloudfront" },
  { pattern: /\b(ec2|compute)\b/i, icon: "aws-ec2" },
  { pattern: /\b(ecs|container service)\b/i, icon: "aws-ecs" },
  { pattern: /\beks\b/i, icon: "aws-eks" },
  { pattern: /\brds\b/i, icon: "aws-rds" },
  { pattern: /\b(kinesis|stream)\b/i, icon: "aws-kinesis" },
  { pattern: /\b(step function|stepfunctions)\b/i, icon: "aws-stepfunctions" },
  { pattern: /\b(glue|etl)\b/i, icon: "aws-glue" },
  { pattern: /\b(athena)\b/i, icon: "aws-athena" },
  { pattern: /\b(redshift)\b/i, icon: "aws-redshift" },
  { pattern: /\b(sagemaker|ml)\b/i, icon: "aws-sagemaker" },
  { pattern: /\b(iam|identity)\b/i, icon: "aws-iam" },
  { pattern: /\b(kms|encryption)\b/i, icon: "aws-kms" },
  { pattern: /\b(waf|firewall)\b/i, icon: "aws-waf" },
  { pattern: /\b(route ?53|dns)\b/i, icon: "aws-route53" },
  { pattern: /\b(elb|load balanc)\b/i, icon: "aws-elb" },
  { pattern: /\bvpc\b/i, icon: "aws-vpc" },
  { pattern: /\bsecrets?\b/i, icon: "aws-secretsmanager" }
];

const AZURE_RULES: IconInferenceRule[] = [
  { pattern: /\b(functions?|azure function)\b/i, icon: "azure-functions" },
  { pattern: /\b(cosmos|cosmosdb)\b/i, icon: "azure-cosmosdb" },
  { pattern: /\b(blob|blob storage)\b/i, icon: "azure-blobstorage" },
  { pattern: /\b(service bus)\b/i, icon: "azure-servicebus" },
  { pattern: /\b(api management|apim)\b/i, icon: "azure-apim" },
  { pattern: /\b(aks|kubernetes)\b/i, icon: "azure-aks" },
  { pattern: /\b(key vault)\b/i, icon: "azure-keyvault" },
  { pattern: /\b(monitor|application insights)\b/i, icon: "azure-monitor" },
  { pattern: /\b(event grid)\b/i, icon: "azure-eventgrid" },
  { pattern: /\b(event hub)\b/i, icon: "azure-eventhubs" },
  { pattern: /\b(front door|cdn)\b/i, icon: "azure-frontdoor" },
  { pattern: /\b(entra|active directory|auth)\b/i, icon: "azure-entra" },
  { pattern: /\b(app service)\b/i, icon: "azure-appservice" },
  { pattern: /\b(sql database|sqldb)\b/i, icon: "azure-sqldb" }
];

const GCP_RULES: IconInferenceRule[] = [
  { pattern: /\b(cloud run)\b/i, icon: "gcp-cloudrun" },
  { pattern: /\b(cloud functions?|functions)\b/i, icon: "gcp-functions" },
  { pattern: /\b(bigquery)\b/i, icon: "gcp-bigquery" },
  { pattern: /\b(pub\/sub|pubsub)\b/i, icon: "gcp-pubsub" },
  { pattern: /\b(cloud storage|gcs)\b/i, icon: "gcp-cloudstorage" },
  { pattern: /\b(firestore)\b/i, icon: "gcp-firestore" },
  { pattern: /\b(gke|kubernetes)\b/i, icon: "gcp-gke" },
  { pattern: /\b(dataflow)\b/i, icon: "gcp-dataflow" },
  { pattern: /\b(vertex|ai platform)\b/i, icon: "gcp-vertexai" },
  { pattern: /\b(cloud sql|sql)\b/i, icon: "gcp-sql" },
  { pattern: /\b(monitoring|logging)\b/i, icon: "gcp-monitoring" },
  { pattern: /\b(load balanc)\b/i, icon: "gcp-loadbalancing" },
  { pattern: /\b(iam|identity)\b/i, icon: "gcp-iam" }
];

const CLOUD_RULES: Record<Exclude<IconInferencePack, "generic">, IconInferenceRule[]> = {
  aws: AWS_RULES,
  azure: AZURE_RULES,
  gcp: GCP_RULES
};

export function inferIconClass(label: string, id: string, pack: IconInferencePack = "generic"): string {
  const text = `${label} ${id}`.toLowerCase().replace(/[^a-z0-9/]+/g, " ");

  if (pack !== "generic") {
    for (const rule of CLOUD_RULES[pack]) {
      if (rule.pattern.test(text)) return rule.icon;
    }
  }

  for (const rule of GENERIC_RULES) {
    if (rule.pattern.test(text)) return rule.icon;
  }

  return "generic-server";
}

export function inferencePackFromDirective(icons: IconPackName): IconInferencePack {
  if (icons === "aws" || icons === "azure" || icons === "gcp") return icons;
  return "generic";
}
