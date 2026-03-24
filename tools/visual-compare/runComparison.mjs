import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import process from "node:process";
import { chromium } from "@playwright/test";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const rootDir = process.cwd();
const outputDir = path.join(rootDir, "artifacts", "visual-comparison", "initial");
const originalUrl = "http://127.0.0.1:4173";
const rewriteUrl = "http://127.0.0.1:4174";

class DevServer {
  constructor(name, command, args, readyText, cwd = rootDir) {
    this.name = name;
    this.command = command;
    this.args = args;
    this.readyText = readyText;
    this.cwd = cwd;
    this.process = null;
    this.ready = false;
    this.buffer = "";
  }

  async start() {
    await new Promise((resolve, reject) => {
      this.process = spawn(this.command, this.args, {
        cwd: this.cwd,
        env: { ...process.env, CI: "1", BROWSER: "none", NO_COLOR: "1" },
        stdio: ["ignore", "pipe", "pipe"]
      });
      const onData = (chunk) => {
        const text = chunk.toString();
        this.buffer += text;
        if (!this.ready && this.buffer.includes(this.readyText)) {
          this.ready = true;
          resolve();
        }
      };
      this.process.stdout?.on("data", onData);
      this.process.stderr?.on("data", onData);
      this.process.once("error", reject);
      this.process.once("exit", (code) => {
        if (!this.ready) {
          reject(new Error(`${this.name} exited before ready with code ${code ?? "null"}.\n${this.buffer}`));
        }
      });
    });
  }

  async stop() {
    if (!this.process || this.process.killed) {
      return;
    }
    this.process.kill("SIGTERM");
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.process?.kill("SIGKILL");
      }, 2000);
      this.process?.once("exit", () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }
}

class VisualComparisonRunner {
  constructor() {
    this.originalServer = new DevServer(
      "original",
      "pnpm",
      ["exec", "vite", "--host", "127.0.0.1", "--port", "4173"],
      "http://127.0.0.1:4173"
    );
    this.rewriteServer = new DevServer(
      "rewrite",
      "pnpm",
      ["--filter", "@gamedemo/host-web", "dev", "--host", "127.0.0.1", "--port", "4174"],
      "http://127.0.0.1:4174"
    );
  }

  async run() {
    await fs.mkdir(outputDir, { recursive: true });
    const browser = await chromium.launch({ headless: true });
    try {
      await this.originalServer.start();
      await this.rewriteServer.start();
      const original = await this.captureCanvas(browser, originalUrl, "original");
      const rewrite = await this.captureCanvas(browser, rewriteUrl, "rewrite");
      const report = await this.createDiff(original, rewrite);
      await fs.writeFile(
        path.join(outputDir, "report.json"),
        JSON.stringify(report, null, 2),
        "utf8"
      );
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } finally {
      await browser.close();
      await this.originalServer.stop();
      await this.rewriteServer.stop();
    }
  }

  async captureCanvas(browser, url, name) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 768 },
      deviceScaleFactor: 1
    });
    try {
      await context.addInitScript(() => {
        window.localStorage.clear();
        window.sessionStorage.clear();
      });
      const page = await context.newPage();
      await page.goto(url, { waitUntil: "networkidle" });
      const canvas = page.locator("canvas").first();
      await canvas.waitFor({ state: "visible", timeout: 30000 });
      await page.waitForTimeout(2500);
      const imagePath = path.join(outputDir, `${name}.png`);
      await canvas.screenshot({ path: imagePath });
      return imagePath;
    } finally {
      await context.close();
    }
  }

  async createDiff(originalPath, rewritePath) {
    const originalImage = PNG.sync.read(await fs.readFile(originalPath));
    const rewriteImage = PNG.sync.read(await fs.readFile(rewritePath));
    const width = Math.min(originalImage.width, rewriteImage.width);
    const height = Math.min(originalImage.height, rewriteImage.height);
    const originalCropped = this.cropPng(originalImage, width, height);
    const rewriteCropped = this.cropPng(rewriteImage, width, height);
    const diff = new PNG({ width, height });
    const mismatchPixels = pixelmatch(
      originalCropped.data,
      rewriteCropped.data,
      diff.data,
      width,
      height,
      { threshold: 0.18 }
    );
    const diffPath = path.join(outputDir, "diff.png");
    await fs.writeFile(diffPath, PNG.sync.write(diff));
    return {
      originalPath,
      rewritePath,
      diffPath,
      originalSize: { width: originalImage.width, height: originalImage.height },
      rewriteSize: { width: rewriteImage.width, height: rewriteImage.height },
      comparedSize: { width, height },
      mismatchPixels,
      mismatchRatio: Number((mismatchPixels / (width * height)).toFixed(6))
    };
  }

  cropPng(image, width, height) {
    if (image.width === width && image.height === height) {
      return image;
    }
    const cropped = new PNG({ width, height });
    PNG.bitblt(image, cropped, 0, 0, width, height, 0, 0);
    return cropped;
  }
}

const runner = new VisualComparisonRunner();
runner.run().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
