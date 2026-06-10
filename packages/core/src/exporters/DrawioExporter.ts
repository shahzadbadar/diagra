import { escapeXml } from "../renderer/escape";
import type { DiagramAst, DiagramEdge, DiagramNode, DiagramSubgraph } from "../types";

type AwsIconConfig = { resIcon: string; fillColor: string };
type GenericIconConfig = { shape: string; fillColor: string; strokeColor: string };

const AWS_ICON_POINTS = "points=[[0,0,0],[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0,0],[0,1,0],[0.25,1,0],[0.5,1,0],[0.75,1,0],[1,1,0],[0,0.25,0],[0,0.5,0],[0,0.75,0],[1,0.25,0],[1,0.5,0],[1,0.75,0]]";

const AWS_DRAWIO_MAP: Record<string, AwsIconConfig> = {
  // Compute — orange
  "aws-lambda":          { resIcon: "lambda",                          fillColor: "#ED7100" },
  "aws-ec2":             { resIcon: "ec2",                             fillColor: "#ED7100" },
  "aws-ecs":             { resIcon: "ecs",                             fillColor: "#ED7100" },
  "aws-eks":             { resIcon: "eks",                             fillColor: "#ED7100" },
  "aws-fargate":         { resIcon: "fargate",                         fillColor: "#ED7100" },
  "aws-elasticbeanstalk":{ resIcon: "elastic_beanstalk",               fillColor: "#ED7100" },
  "aws-stepfunctions":   { resIcon: "step_functions",                  fillColor: "#ED7100" },
  // Storage — green
  "aws-s3":              { resIcon: "s3",                              fillColor: "#7AA116" },
  // Database — purple
  "aws-dynamodb":        { resIcon: "dynamodb",                        fillColor: "#C925D1" },
  "aws-rds":             { resIcon: "rds",                             fillColor: "#C925D1" },
  "aws-redshift":        { resIcon: "redshift",                        fillColor: "#C925D1" },
  "aws-opensearch":      { resIcon: "opensearch_service",              fillColor: "#C925D1" },
  "aws-elasticache":     { resIcon: "elasticache",                     fillColor: "#C925D1" },
  // Networking — violet
  "aws-apigateway":      { resIcon: "api_gateway",                     fillColor: "#8C4FFF" },
  "aws-cloudfront":      { resIcon: "cloudfront",                      fillColor: "#8C4FFF" },
  "aws-route53":         { resIcon: "route_53",                        fillColor: "#8C4FFF" },
  "aws-elb":             { resIcon: "elastic_load_balancing",          fillColor: "#8C4FFF" },
  "aws-vpc":             { resIcon: "vpc",                             fillColor: "#8C4FFF" },
  // Messaging — pink
  "aws-sns":             { resIcon: "sns",                             fillColor: "#E7157B" },
  "aws-sqs":             { resIcon: "sqs",                             fillColor: "#E7157B" },
  "aws-eventbridge":     { resIcon: "eventbridge",                     fillColor: "#E7157B" },
  "aws-kinesis":         { resIcon: "kinesis",                         fillColor: "#E7157B" },
  // Security — red
  "aws-iam":             { resIcon: "identity_and_access_management",  fillColor: "#DD344C" },
  "aws-cognito":         { resIcon: "cognito",                         fillColor: "#DD344C" },
  "aws-kms":             { resIcon: "key_management_service",          fillColor: "#DD344C" },
  "aws-waf":             { resIcon: "waf",                             fillColor: "#DD344C" },
  "aws-secretsmanager":  { resIcon: "secrets_manager",                 fillColor: "#DD344C" },
  // Management / Observability — pink
  "aws-cloudwatch":      { resIcon: "cloudwatch",                      fillColor: "#E7157B" },
  "aws-cloudformation":  { resIcon: "cloudformation",                  fillColor: "#E7157B" },
  "aws-xray":            { resIcon: "xray",                            fillColor: "#E7157B" },
  // AI/ML — teal
  "aws-sagemaker":       { resIcon: "sagemaker",                       fillColor: "#01A88D" },
  // Analytics — violet
  "aws-athena":          { resIcon: "athena",                          fillColor: "#8C4FFF" },
  "aws-glue":            { resIcon: "glue",                            fillColor: "#8C4FFF" },
};

const GENERIC_DRAWIO_MAP: Record<string, GenericIconConfig> = {
  "generic-database": { shape: "cylinder3",              fillColor: "#dae8fc", strokeColor: "#6c8ebf" },
  "generic-queue":    { shape: "mxgraph.flowchart.start_2", fillColor: "#ffe6cc", strokeColor: "#d79b00" },
  "generic-cloud":    { shape: "cloud",                  fillColor: "#dae8fc", strokeColor: "#6c8ebf" },
  "generic-server":   { shape: "server",                 fillColor: "#f5f5f5", strokeColor: "#666666" },
};

export class DrawioExporter {
  export(ast: DiagramAst): string {
    const nodeSubgraph = new Map<string, string>();
    for (const sg of ast.subgraphs) {
      for (const nodeId of sg.nodeIds) {
        nodeSubgraph.set(nodeId, sg.id);
      }
    }

    const subgraphCells = ast.subgraphs.map((sg) => this.renderSubgraph(sg));
    const nodeCells = ast.nodes.map((node) => {
      const sgId = nodeSubgraph.get(node.id);
      const sg = sgId ? ast.subgraphs.find((s) => s.id === sgId) : undefined;
      return this.renderNode(node, sg);
    });
    const edgeCells = ast.edges.map((edge) => this.renderEdge(edge));

    const cells = [
      '<mxCell id="0"/>',
      '<mxCell id="1" parent="0"/>',
      ...subgraphCells,
      ...nodeCells,
      ...edgeCells,
    ].join("\n        ");

    return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="diagra" version="1.0">
  <diagram id="diagram-1" name="Page-1">
    <mxGraphModel dx="1434" dy="759" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1654" pageHeight="1169" math="0" shadow="0">
      <root>
        ${cells}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
  }

  private renderSubgraph(sg: DiagramSubgraph): string {
    const stroke = sg.style?.stroke ?? "#666666";
    const fill = sg.style?.fill ?? "#ffffff";
    const style = `points=[[0,0],[0.25,0],[0.5,0],[0.75,0],[1,0],[1,0.25],[1,0.5],[1,0.75],[1,1],[0.75,1],[0.5,1],[0.25,1],[0,1],[0,0.75],[0,0.5],[0,0.25]];shape=mxgraph.aws4.group;strokeColor=${stroke};fillColor=${fill};verticalAlign=top;align=center;spacingTop=25;dashed=0;`;
    return `<mxCell id="group-${escapeXml(sg.id)}" value="${escapeXml(sg.label)}" style="${style}" vertex="1" parent="1"><mxGeometry x="${sg.x}" y="${sg.y}" width="${sg.width}" height="${sg.height}" as="geometry"/></mxCell>`;
  }

  private renderNode(node: DiagramNode, subgraph?: DiagramSubgraph): string {
    const iconClass = node.classes[0] ?? "";
    const parentId = subgraph ? `group-${escapeXml(subgraph.id)}` : "1";
    const x = subgraph ? node.x - subgraph.x : node.x;
    const y = subgraph ? node.y - subgraph.y : node.y;

    const awsCfg = AWS_DRAWIO_MAP[iconClass];
    if (awsCfg) {
      const style = `sketch=0;${AWS_ICON_POINTS};outlineConnect=0;fontColor=#232F3E;fillColor=${awsCfg.fillColor};strokeColor=#ffffff;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=12;fontStyle=0;aspect=fixed;shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.${awsCfg.resIcon};`;
      return `<mxCell id="node-${escapeXml(node.id)}" value="${escapeXml(node.label)}" style="${style}" vertex="1" parent="${parentId}"><mxGeometry x="${x}" y="${y}" width="78" height="78" as="geometry"/></mxCell>`;
    }

    const genericCfg = GENERIC_DRAWIO_MAP[iconClass];
    if (genericCfg) {
      const style = `shape=${genericCfg.shape};fillColor=${genericCfg.fillColor};strokeColor=${genericCfg.strokeColor};html=1;whiteSpace=wrap;`;
      return `<mxCell id="node-${escapeXml(node.id)}" value="${escapeXml(node.label)}" style="${style}" vertex="1" parent="${parentId}"><mxGeometry x="${x}" y="${y}" width="${node.width}" height="${node.height}" as="geometry"/></mxCell>`;
    }

    const fill = node.style?.fill ?? "#f5f5f5";
    const stroke = node.style?.stroke ?? "#666666";
    const style = `rounded=1;whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=${stroke};`;
    return `<mxCell id="node-${escapeXml(node.id)}" value="${escapeXml(node.label)}" style="${style}" vertex="1" parent="${parentId}"><mxGeometry x="${x}" y="${y}" width="${node.width}" height="${node.height}" as="geometry"/></mxCell>`;
  }

  private renderEdge(edge: DiagramEdge): string {
    const baseStyle = `edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;`;
    const dashedStyle = edge.dashed ? `dashed=1;dashPattern=8 8;strokeColor=#999999;strokeWidth=1;` : "";
    const strokeStyle = edge.style?.stroke ? `strokeColor=${edge.style.stroke};` : "";
    const style = baseStyle + dashedStyle + strokeStyle;
    return `<mxCell id="${escapeXml(edge.id)}" value="${escapeXml(edge.label ?? "")}" style="${style}" edge="1" source="node-${escapeXml(edge.from)}" target="node-${escapeXml(edge.to)}" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>`;
  }
}
