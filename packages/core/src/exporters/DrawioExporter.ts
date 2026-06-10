import { escapeXml } from "../renderer/escape";
import type { DiagramAst } from "../types";

export class DrawioExporter {
  export(ast: DiagramAst): string {
    const cells = [
      '<mxCell id="0"/>',
      '<mxCell id="1" parent="0"/>',
      ...ast.nodes.map((node) => `<mxCell id="node-${escapeXml(node.id)}" value="${escapeXml(node.label)}" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1"><mxGeometry x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" as="geometry"/></mxCell>`),
      ...ast.edges.map((edge) => `<mxCell id="${escapeXml(edge.id)}" value="${escapeXml(edge.label ?? "")}" edge="1" parent="1" source="node-${escapeXml(edge.from)}" target="node-${escapeXml(edge.to)}" style="endArrow=block;html=1;rounded=0;${edge.dashed ? "dashed=1;" : ""}"><mxGeometry relative="1" as="geometry"/></mxCell>`)
    ].join("");
    return `<mxfile host="diagra"><diagram name="Diagram"><mxGraphModel><root>${cells}</root></mxGraphModel></diagram></mxfile>`;
  }
}
