const { chromium } = require("/opt/npm-tools/node_modules/playwright");
const path = require("path");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1100, height: 1400 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto("file://" + path.resolve(__dirname, "fixture.html"));
  await p.addStyleTag({ path: path.resolve(__dirname, "../styles.css") });
  await p.addScriptTag({ path: path.resolve(__dirname, "../rules.js") });
  await p.addScriptTag({ path: path.resolve(__dirname, "../content.js") });
  const txt = (s) => p.$eval(s, (e) => e.textContent);
  console.log("GPA", await txt("#ucg-panel .ucg-stat-main .ucg-value"), "| class:", await txt("#ucg-panel .ucg-stat-main .ucg-class"), "| credits", await txt(".ucg-value-sm"));
  console.log("years", await p.$$eval(".ucg-year", (es) => es.map((e) => e.textContent)));
  console.log("sems", await p.$$eval(".ucg-table:not(.ucg-fut) tbody tr", (rs) => rs.map((r) => r.textContent.replace(/\s+/g, " "))));
  await p.screenshot({ path: path.resolve(__dirname, "shot-1.png"), fullPage: true });
  // untick Research Methods
  const row = p.locator("tr", { hasText: "SCS3216" });
  await row.locator("input.ucg-cb").uncheck();
  console.log("after untick SCS3216:", await txt(".ucg-stat-main .ucg-value"));
  await row.locator("input.ucg-cb").check();
  // estimate: repeat SCS3216 with A
  await p.click("text=Estimate with expected results");
  await p.click("text=+ Add course");
  await p.fill(".ucg-fut input[type=text]", "SCS3216");
  await p.fill(".ucg-fut input[type=number]", "2");
  console.log("projected (SCS3216 repeat A→C):", await txt(".ucg-stat-proj .ucg-value"));
  await p.selectOption(".ucg-fut tbody tr td:nth-child(4) select", "4");
  await p.click("text=+ Add course");
  await p.fill(".ucg-fut tbody tr:nth-child(2) input[type=text]", "SCS4223");
  await p.fill(".ucg-fut tbody tr:nth-child(2) input[type=number]", "8");
  await p.selectOption(".ucg-fut tbody tr:nth-child(2) td:nth-child(4) select", "4");
  console.log("projected (+8cr A):", await txt(".ucg-stat-proj .ucg-value"), await txt(".ucg-stat-proj .ucg-class"));
  console.log("stored", await p.evaluate(() => localStorage.getItem("ucsc-gpa:22000488")));
  await p.screenshot({ path: path.resolve(__dirname, "shot-2.png"), fullPage: false });
  console.log("errors", errs);
  await b.close();
})();
