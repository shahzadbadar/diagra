import { Buffer } from "node:buffer";
import type { RenderOptions } from "../types";

export class PNGExporter {
  async export(svg: string, options: RenderOptions = {}): Promise<Buffer> {
    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.default.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: options.width ?? 1200, height: options.height ?? 800, deviceScaleFactor: 2 });
      await page.setContent(`<body style="margin:0">${svg}</body>`, { waitUntil: "networkidle0" });
      const element = await page.$("svg");
      if (!element) throw new Error("Rendered SVG element was not found.");
      return Buffer.from(await element.screenshot({ omitBackground: options.transparent ?? false }));
    } finally {
      await browser.close();
    }
  }
}
