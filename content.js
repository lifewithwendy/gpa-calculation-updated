(function () {
  "use strict";
  const R = globalThis.UCSCGPA;
  if (!R || document.getElementById("ucg-panel")) return;

  const GRADES = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "E"];
  const SEMESTERS = ["1", "2", "1&2"];

  // ---------- tiny DOM helper ----------
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k in el && k !== "list") el[k] = v;
      else el.setAttribute(k, v);
    });
    kids.flat().forEach((c) => {
      if (c == null || c === false) return;
      el.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
    });
    return el;
  }
  const clean = (s) => String(s || "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
  const fmt = (x) => (x == null ? "—" : x.toFixed(2));

  // ---------- locate & parse the results tables ----------
  function headerCells(t) {
    // Prefer <thead>; fall back to the first row that has <th>/<td> header text.
    let row = t.querySelector("thead tr") || t.querySelector("tr");
    return row ? [...row.children].map((c) => clean(c.textContent).toLowerCase()) : [];
  }
  function findTables() {
    return [...document.querySelectorAll("table")].filter((t) => {
      if (t.dataset.ucg) return false;
      const head = headerCells(t);
      return head.includes("subject") && head.includes("result") && head.includes("credits");
    });
  }

  // The results may be rendered after page load, so wait for them.
  const first = findTables();
  if (first.length) return main(first);
  console.info("[UCSC GPA] results table not found yet — waiting…");
  const obs = new MutationObserver(() => {
    const t = findTables();
    if (t.length) { obs.disconnect(); clearTimeout(timer); setTimeout(() => main(findTables()), 300); }
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
  const timer = setTimeout(() => { obs.disconnect(); console.warn("[UCSC GPA] no results table found on this page."); }, 60000);

  function main(tables) {
  if (document.getElementById("ucg-panel")) return;
  console.info("[UCSC GPA] found " + tables.length + " results table(s)");

  function yearHeadingFor(table) {
    let el = table.previousElementSibling;
    while (el) {
      if (el.classList.contains("ayear_con")) {
        const m = clean(el.textContent).match(/year\s*(\d+)/i);
        return { n: m ? +m[1] : 0, el };
      }
      el = el.previousElementSibling;
    }
    return { n: 0, el: null };
  }

  const attempts = [];
  const rowsById = {};
  const yearSections = []; // { n, summaryEl }
  let order = 0;

  tables.forEach((table) => {
    table.dataset.ucg = "1";
    const head = headerCells(table);
    const idx = {
      subject: head.indexOf("subject"),
      year: head.indexOf("year"),
      semester: head.indexOf("semester"),
      credits: head.indexOf("credits"),
      result: head.indexOf("result")
    };
    const ys = yearHeadingFor(table);
    let summaryEl = ys.el && ys.el.nextElementSibling && ys.el.nextElementSibling.classList.contains("rescomcon")
      ? ys.el.nextElementSibling : null;
    yearSections.push({ n: ys.n, summaryEl, table });

    // Extra header cells
    const headRow = table.querySelector("thead tr") || table.querySelector("tr");
    headRow.insertBefore(h("th", { class: "ucg-col", title: "Include in GPA" }, "GPA"), headRow.firstChild);
    headRow.appendChild(h("th", { class: "ucg-col" }, "Points"));

    [...table.querySelectorAll("tr")].forEach((tr) => {
      if (tr === headRow) return;
      const tds = tr.querySelectorAll(":scope > td");
      if (tds.length < 5) return;
      const subject = clean(tds[idx.subject].textContent);
      const cm = subject.match(/^([A-Z]{2,5}\s?\d{3,5}[A-Z]?)\s*(.*)$/);
      const code = cm ? cm[1].replace(/\s/g, "") : subject;
      const examYear = parseInt(clean(tds[idx.year] && tds[idx.year].textContent).replace(/[^\d]/g, ""), 10) || 0;
      const semester = clean(tds[idx.semester] && tds[idx.semester].textContent).replace(/[[\]]/g, "").replace(/&amp;/g, "&");
      const credits = parseFloat(clean(tds[idx.credits].textContent)) || 0;
      const result = clean(tds[idx.result].textContent);
      const id = "r" + order;
      const a = { id, code, name: cm ? cm[2] : subject, examYear, order: order++, credits, result, yearOfStudy: ys.n, semester };
      attempts.push(a);

      const cb = h("input", { type: "checkbox", class: "ucg-cb" });
      cb.addEventListener("change", () => {
        if (cb.checked) state.excluded = state.excluded.filter((c) => c !== code);
        else if (!state.excluded.includes(code)) state.excluded.push(code);
        save(); render();
      });
      const cbCell = h("td", { class: "ucg-col ucg-cbcell" }, cb);
      const ptsCell = h("td", { class: "ucg-col ucg-pts" });
      tr.insertBefore(cbCell, tr.firstChild);
      tr.appendChild(ptsCell);
      rowsById[id] = { tr, cb, ptsCell, attempt: a };
    });
  });

  // ---------- persistence ----------
  const regMatch = clean((document.querySelector(".navbar-text") || {}).textContent).match(/\((\d+)\)/);
  const storeKey = "ucsc-gpa:" + (regMatch ? regMatch[1] : "default");
  const state = { excluded: [], future: [] };
  const hasChromeStore = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;

  function save() {
    const data = { excluded: state.excluded, future: state.future };
    try {
      if (hasChromeStore) chrome.storage.local.set({ [storeKey]: data });
      else localStorage.setItem(storeKey, JSON.stringify(data));
    } catch (e) { /* storage is a convenience only */ }
  }
  function load(cb) {
    const apply = (d) => {
      if (d && Array.isArray(d.excluded)) state.excluded = d.excluded;
      if (d && Array.isArray(d.future)) state.future = d.future;
      cb();
    };
    try {
      if (hasChromeStore) chrome.storage.local.get(storeKey, (r) => apply(r && r[storeKey]));
      else apply(JSON.parse(localStorage.getItem(storeKey) || "null"));
    } catch (e) { apply(null); }
  }

  // ---------- panel ----------
  const els = {};
  const panel = h("div", { id: "ucg-panel", class: "ucg-panel" },
    h("div", { class: "ucg-head" },
      h("h3", { class: "ucg-title" }, "GPA Calculator"),
      h("button", { class: "ucg-btn ucg-btn-ghost", type: "button", onclick: () => { state.excluded = []; save(); render(); } }, "Include all")
    ),
    h("div", { class: "ucg-stats" },
      h("div", { class: "ucg-stat ucg-stat-main" },
        h("div", { class: "ucg-label" }, "Current GPA"),
        els.gpa = h("div", { class: "ucg-value" }, "—"),
        els.cls = h("div", { class: "ucg-class" })
      ),
      h("div", { class: "ucg-stat" },
        h("div", { class: "ucg-label" }, "GPA credits"),
        els.credits = h("div", { class: "ucg-value ucg-value-sm" }, "—")
      ),
      els.projBox = h("div", { class: "ucg-stat ucg-stat-proj", hidden: true },
        h("div", { class: "ucg-label" }, "Projected GPA"),
        els.proj = h("div", { class: "ucg-value" }, "—"),
        els.projCls = h("div", { class: "ucg-class" })
      )
    ),
    h("details", { class: "ucg-section", open: true },
      h("summary", null, "Semester GPA"),
      els.semTable = h("table", { class: "ucg-table" })
    ),
    h("details", { class: "ucg-section" },
      h("summary", null, "Estimate with expected results"),
      h("p", { class: "ucg-hint" },
        "Add courses you expect to sit. Reuse an existing code (e.g. a failed or absent subject) to model a repeat — the C cap applies automatically."),
      els.futTable = h("table", { class: "ucg-table ucg-fut" }),
      h("button", { class: "ucg-btn", type: "button", onclick: addFuture }, "+ Add course")
    ),
    h("p", { class: "ucg-foot" },
      "Repeats are capped at C unless the previous attempt was a medical. EC, NC, CN, WH, CM and 0-credit courses are ignored. Untick a subject to leave it out.")
  );

  const anchor = tables[0].closest(".card") || tables[0];
  anchor.parentNode.insertBefore(panel, anchor);

  function addFuture() {
    state.future.push({ code: "", credits: 3, grade: "A", year: maxYear(), semester: "1" });
    save(); render();
  }
  function maxYear() {
    return Math.max(1, ...attempts.map((a) => a.yearOfStudy));
  }

  function futureAttempts() {
    return state.future.map((f, i) => {
      const code = clean(f.code).toUpperCase().replace(/\s/g, "") || "EXPECTED-" + (i + 1);
      const existing = attempts.find((a) => a.code === code);
      return {
        id: "f" + i, code, name: existing ? existing.name : "Expected course",
        examYear: 9000 + i, order: 100000 + i,
        credits: +f.credits || 0, result: f.grade,
        yearOfStudy: +f.year || 1, semester: f.semester || "1"
      };
    });
  }

  function renderFuture() {
    const t = els.futTable;
    t.textContent = "";
    if (!state.future.length) return;
    t.appendChild(h("thead", null, h("tr", null,
      h("th", null, "Code"), h("th", null, "Credits"), h("th", null, "Grade"),
      h("th", null, "Year"), h("th", null, "Sem"), h("th", null, ""))));
    const tb = h("tbody");
    state.future.forEach((f, i) => {
      const upd = (k) => (e) => { f[k] = e.target.value; save(); render(true); };
      const sel = (opts, val, k) => h("select", { class: "ucg-in", onchange: upd(k) },
        opts.map((o) => h("option", { value: o, selected: String(o) === String(val) }, String(o))));
      tb.appendChild(h("tr", null,
        h("td", null, h("input", { class: "ucg-in", type: "text", value: f.code, placeholder: "SCS3216", size: 9, oninput: upd("code") })),
        h("td", null, h("input", { class: "ucg-in ucg-num", type: "number", min: 0, max: 12, step: 1, value: f.credits, oninput: upd("credits") })),
        h("td", null, sel(GRADES, f.grade, "grade")),
        h("td", null, sel([1, 2, 3, 4], f.year, "year")),
        h("td", null, sel(SEMESTERS, f.semester, "semester")),
        h("td", null, h("button", { class: "ucg-x", type: "button", title: "Remove",
          onclick: () => { state.future.splice(i, 1); save(); render(); } }, "×"))
      ));
    });
    t.appendChild(tb);
  }

  function render(skipFutureRebuild) {
    const excluded = new Set(state.excluded);
    const cur = R.compute(attempts, excluded);
    const fut = futureAttempts();
    const proj = fut.length ? R.compute(attempts.concat(fut), excluded) : null;

    // stats
    els.gpa.textContent = fmt(cur.gpa);
    els.cls.textContent = cur.classification || "";
    els.cls.hidden = !cur.classification;
    els.credits.textContent = String(cur.credits);
    els.projBox.hidden = !proj;
    if (proj) {
      els.proj.textContent = fmt(proj.gpa);
      els.projCls.textContent = proj.classification || "";
      els.projCls.hidden = !proj.classification;
    }

    // semester table (projected when estimating)
    const view = proj || cur;
    const st = els.semTable;
    st.textContent = "";
    st.appendChild(h("thead", null, h("tr", null,
      h("th", null, "Year"), h("th", null, "Semester"), h("th", null, "Credits"), h("th", null, proj ? "GPA (projected)" : "GPA"))));
    const sb = h("tbody");
    view.semesters.forEach((s) => sb.appendChild(h("tr", null,
      h("td", null, String(s.yearOfStudy || "—")), h("td", null, s.semester),
      h("td", null, String(s.credits)), h("td", { class: "ucg-strong" }, fmt(s.gpa)))));
    st.appendChild(sb);

    // rows
    const courseByCode = new Map(cur.courses.map((c) => [c.code, c]));
    Object.values(rowsById).forEach(({ tr, cb, ptsCell, attempt }) => {
      const pa = cur.perAttempt[attempt.id];
      const course = courseByCode.get(attempt.code);
      const eligible = !!course && pa && pa.status !== "ignored" && pa.status !== "medical";
      cb.disabled = !eligible;
      cb.checked = eligible && course.included;
      cb.title = eligible ? "Include in GPA" : "Not counted toward GPA";
      tr.classList.toggle("ucg-excluded", eligible && !course.included);
      ptsCell.textContent = "";
      if (!pa) return;
      if (pa.points != null) ptsCell.appendChild(document.createTextNode(pa.points.toFixed(2)));
      const badge = {
        capped: ["repeat · capped at C", "warn"],
        superseded: ["not counted · better attempt used", "muted"],
        medical: ["medical", "info"],
        ignored: ["n/a", "muted"]
      }[pa.status];
      if (badge) ptsCell.appendChild(h("span", { class: "ucg-badge ucg-" + badge[1] }, badge[0]));
    });

    // per-year summaries in the portal's own placeholders
    yearSections.forEach((ys) => {
      let el = ys.summaryEl;
      if (!el) {
        el = h("div", { class: "rescomcon col-md-12" });
        ys.table.parentNode.insertBefore(el, ys.table);
        ys.summaryEl = el;
      }
      const y = cur.years[ys.n];
      el.textContent = "";
      el.classList.add("ucg-year");
      if (y && y.gpa != null) {
        el.appendChild(h("span", null, "Year " + ys.n + " GPA: ", h("b", null, fmt(y.gpa)), " · " + y.credits + " credits"));
      }
    });

    if (!skipFutureRebuild) renderFuture();
  }

  load(() => render());
  } // main
})();
