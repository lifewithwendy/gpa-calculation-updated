/*
 * Pure GPA rules — no DOM. Shared by content.js and the Node tests.
 * Adjust the constants here if the faculty's by-laws differ for your batch.
 */
(function (root) {
  "use strict";

  const GRADE_POINTS = {
    "A+": 4.0, "A": 4.0, "A-": 3.7,
    "B+": 3.3, "B": 3.0, "B-": 2.7,
    "C+": 2.3, "C": 2.0, "C-": 1.7,
    "D+": 1.3, "D": 1.0, "E": 0.0,
    "F": 0.0
  };

  // Max grade point on a repeat attempt (unless the previous attempt was medical).
  const REPEAT_CAP = 2.0; // C

  // Results that are excluded from GPA entirely.
  const IGNORED = new Set(["EC", "NC", "CN", "WH", "CM", "NR", "-", "", ""]);

  // Results meaning an approved medical: the attempt doesn't count,
  // and the next attempt is treated as a first attempt (no cap).
  const MEDICAL = new Set(["MC", "MED", "MEDICAL", "M", "AB"]);

  // Highest first. Shown only when GPA reaches the threshold.
  const CLASSES = [
    { min: 3.7, name: "First Class" },
    { min: 3.3, name: "Second Class (Upper Division)" },
    { min: 3.0, name: "Second Class (Lower Division)" }
  ];

  function normGrade(g) {
    return String(g || "").replace(/ /g, " ").trim().toUpperCase();
  }

  /** "gpa" | "medical" | "ignored" */
  function kindOf(attempt) {
    const g = normGrade(attempt.result);
    if (MEDICAL.has(g)) return "medical";
    if (IGNORED.has(g) || !(g in GRADE_POINTS)) return "ignored";
    if (!(attempt.credits > 0)) return "ignored";
    return "gpa";
  }

  /**
   * attempts: [{ id, code, name, examYear, order, credits, result, yearOfStudy, semester }]
   * excluded: Set of course codes the user deselected
   * Returns { courses, perAttempt, gpa, credits, points, classification, semesters }
   */
  function compute(attempts, excluded) {
    excluded = excluded || new Set();
    const byCode = new Map();
    attempts.forEach((a) => {
      const key = a.code || a.id;
      if (!byCode.has(key)) byCode.set(key, []);
      byCode.get(key).push(a);
    });

    const perAttempt = {}; // id -> { status, points }
    const courses = [];

    byCode.forEach((list, code) => {
      list.sort((x, y) => (x.examYear - y.examYear) || (x.order - y.order));
      let priorCounted = 0; // graded attempts (non-medical) before this one
      let lastWasMedical = false;
      let best = null;

      list.forEach((a) => {
        const kind = kindOf(a);
        if (kind === "medical") {
          perAttempt[a.id] = { status: "medical", points: null };
          lastWasMedical = true;
          return;
        }
        if (kind === "ignored") {
          perAttempt[a.id] = { status: "ignored", points: null };
          return;
        }
        const raw = GRADE_POINTS[normGrade(a.result)];
        const isRepeat = priorCounted > 0 && !lastWasMedical;
        const pts = isRepeat ? Math.min(raw, REPEAT_CAP) : raw;
        const capped = isRepeat && raw > REPEAT_CAP;
        perAttempt[a.id] = { status: capped ? "capped" : "counted", points: pts, raw };
        priorCounted++;
        lastWasMedical = false;
        // Later attempt wins ties so the newest sitting is the one shown.
        if (!best || pts >= best.points) best = { attempt: a, points: pts };
      });

      if (best) {
        list.forEach((a) => {
          const p = perAttempt[a.id];
          if (a !== best.attempt && (p.status === "counted" || p.status === "capped")) {
            p.status = "superseded";
          }
        });
        const first = list[0];
        courses.push({
          code,
          name: best.attempt.name,
          credits: best.attempt.credits,
          points: best.points,
          attemptId: best.attempt.id,
          yearOfStudy: first.yearOfStudy,
          semester: first.semester,
          included: !excluded.has(code)
        });
      }
    });

    const agg = (cs) => {
      let cr = 0, pts = 0;
      cs.forEach((c) => { if (c.included) { cr += c.credits; pts += c.credits * c.points; } });
      return { credits: cr, weighted: pts, gpa: cr > 0 ? pts / cr : null };
    };

    const total = agg(courses);

    const semMap = new Map();
    courses.forEach((c) => {
      const key = `${c.yearOfStudy}|${c.semester}`;
      if (!semMap.has(key)) semMap.set(key, { yearOfStudy: c.yearOfStudy, semester: c.semester, courses: [] });
      semMap.get(key).courses.push(c);
    });
    const semesters = [...semMap.values()]
      .map((s) => Object.assign(s, agg(s.courses)))
      .sort((a, b) => (a.yearOfStudy - b.yearOfStudy) || semRank(a.semester) - semRank(b.semester));

    const yearMap = new Map();
    courses.forEach((c) => {
      if (!yearMap.has(c.yearOfStudy)) yearMap.set(c.yearOfStudy, []);
      yearMap.get(c.yearOfStudy).push(c);
    });
    const years = {};
    yearMap.forEach((cs, y) => { years[y] = agg(cs); });

    return {
      courses, perAttempt, semesters, years,
      gpa: total.gpa, credits: total.credits, weighted: total.weighted,
      classification: classify(total.gpa)
    };
  }

  // 1, 2, then year-long (1&2) last
  function semRank(s) {
    const n = parseInt(s, 10);
    return /&/.test(String(s)) ? 9 : (isNaN(n) ? 10 : n);
  }

  function classify(gpa) {
    if (gpa == null) return null;
    const c = CLASSES.find((k) => gpa >= k.min);
    return c ? c.name : null;
  }

  const api = { GRADE_POINTS, REPEAT_CAP, IGNORED, MEDICAL, CLASSES, normGrade, kindOf, compute, classify };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.UCSCGPA = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
