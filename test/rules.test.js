const assert = require("assert");
const R = require("../rules.js");
let id = 0;
const A = (code, credits, result, examYear = 20, sem = "1", y = 1) =>
  ({ id: "t" + id++, code, name: code, examYear, order: id, credits, result, yearOfStudy: y, semester: sem });

// repeat capped at C, best attempt used
let r = R.compute([A("X1", 3, "E", 20), A("X1", 3, "A", 21)]);
assert.strictEqual(r.gpa, 2.0);
// medical then A → uncapped
r = R.compute([A("X2", 3, "MC", 20), A("X2", 3, "A", 21)]);
assert.strictEqual(r.gpa, 4.0);
// absent then B → capped
r = R.compute([A("X3", 2, "Ab", 20), A("X3", 2, "B", 21)]);
assert.strictEqual(r.gpa, 2.0);
// repeat that scores lower than C keeps the better of the two
r = R.compute([A("X4", 2, "D", 20), A("X4", 2, "C-", 21)]);
assert.strictEqual(r.gpa, 1.7);
// ignored codes + 0 credits
r = R.compute([A("X5", 3, "EC"), A("X6", 3, "WH"), A("X7", 0, "A"), A("X8", 2, "CM"), A("X9", 3, "NC"), A("Y1", 3, "CN"), A("Y2", 2, "B")]);
assert.strictEqual(r.gpa, 3.0); assert.strictEqual(r.credits, 2);
// exclusion
r = R.compute([A("Z1", 3, "A"), A("Z2", 3, "E")], new Set(["Z2"]));
assert.strictEqual(r.gpa, 4.0);
// class thresholds (no rounding up)
assert.strictEqual(R.classify(3.7), "First Class");
assert.strictEqual(R.classify(3.699), "Second Class (Upper Division)");
assert.strictEqual(R.classify(2.9), null);
console.log("rules: all passed");
