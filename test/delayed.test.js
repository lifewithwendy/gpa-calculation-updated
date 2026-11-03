const { chromium } = require("/opt/npm-tools/node_modules/playwright");
const fs = require("fs"), path = require("path");
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.setContent("<html><body><div id='app'>Loading…</div></body></html>");
  await p.addStyleTag({ path: path.resolve(__dirname, "../styles.css") });
  await p.addScriptTag({ path: path.resolve(__dirname, "../rules.js") });
  await p.addScriptTag({ path: path.resolve(__dirname, "../content.js") });
  const body = fs.readFileSync(path.resolve(__dirname, "fixture.html"), "utf8").match(/<body>([\s\S]*)<\/body>/)[1];
  await p.waitForTimeout(800);
  await p.evaluate((h) => { document.getElementById("app").innerHTML = h; }, body);
  await p.waitForSelector("#ucg-panel", { timeout: 5000 });
  console.log("delayed render GPA:", await p.$eval(".ucg-stat-main .ucg-value", (e) => e.textContent), "errors", errs);
  await b.close();
})();
