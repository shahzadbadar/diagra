export class HTMLExporter {
  export(svg: string): string {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Diagra Diagram</title>
  <style>
    html, body { margin: 0; min-height: 100%; background: #f8fafc; font-family: Inter, system-ui, sans-serif; }
    body { display: grid; place-items: center; padding: 24px; }
    svg { max-width: 100%; height: auto; }
    .diagra-node { cursor: pointer; }
    .diagra-node.is-active rect { stroke: var(--accent); stroke-width: 2.5; }
  </style>
</head>
<body>
${svg}
<script>
  document.querySelectorAll('.diagra-node').forEach((node) => {
    node.addEventListener('click', () => node.classList.toggle('is-active'));
  });
</script>
</body>
</html>`;
  }
}
