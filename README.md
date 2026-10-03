<div align="center">

<img src="icons/icon128.png" alt="UCSC GPA Calculator icon" width="96" height="96">

# UCSC GPA Calculator

**A Chrome extension that adds a live GPA calculator to the UCSC student portal's exam results page.**

![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4?logo=googlechrome&logoColor=white)
![Version](https://img.shields.io/badge/version-1.0.1-blue)
![Dependencies](https://img.shields.io/badge/dependencies-none-brightgreen)
![Privacy](https://img.shields.io/badge/data-stays%20in%20your%20browser-success)

</div>

---

## Overview

Open your exam results on the UCSC portal and the extension reads the results tables already on the page, then shows your GPA, class, and semester and year breakdowns. Everything is calculated locally in your browser.

## Features

- **Current GPA** and degree **class** (First, Second Upper, Second Lower), shown once your GPA reaches the threshold.
- **Semester GPA** table, plus a **per-year GPA** summary under each year heading.
- **Repeat handling.** Repeat attempts are capped at **C**, unless the previous attempt was an approved medical. The best attempt counts, and the others are marked *not counted*.
- **Include/exclude any subject** with a checkbox beside each row. Your choices are remembered.
- **Estimate with expected results.** Add courses you expect to sit, or reuse an existing code to model a repeat, and see a projected GPA and class.
- **Per-row points and badges** such as *repeat · capped at C*, *medical* and *n/a*.
- Works if the results load after the page does.

## Installation

The extension isn't on the Chrome Web Store, so load it unpacked:

1. Clone or download this repository.
   ```bash
   git clone https://github.com/lifewithwendy/gpa-calculation-updated.git
   ```
2. Open `chrome://extensions` in Chrome, Edge, Brave or another Chromium browser.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the project folder, the one containing `manifest.json`.
5. Sign in to the UCSC portal and open your **exam results** page. The **GPA Calculator** panel appears above the results.

## How GPA is calculated

```
GPA = Σ (credits × grade points) ÷ Σ credits
```

| Grade | Points | Grade | Points |
| :---: | :----: | :---: | :----: |
| A+ / A | 4.0 | C | 2.0 |
| A- | 3.7 | C- | 1.7 |
| B+ | 3.3 | D+ | 1.3 |
| B | 3.0 | D | 1.0 |
| B- | 2.7 | E / F | 0.0 |
| C+ | 2.3 | | |

| Class | Minimum GPA |
| --- | :---: |
| First Class | 3.70 |
| Second Class (Upper Division) | 3.30 |
| Second Class (Lower Division) | 3.00 |

**Rules applied**

- A repeat attempt scores at most **C (2.0)**, unless the previous attempt was an approved medical.
- When a course has several attempts, the best-scoring one is used.
- `EC`, `NC`, `CN`, `WH`, `CM`, `NR` and **0-credit** courses are left out of the GPA.
- Approved medical results don't count as an attempt, and the next sitting is treated as a first attempt.

> The grade scale, repeat cap and class thresholds follow common UCSC rules, but your batch's by-laws may differ. Check them against the official regulations. To change them, edit the constants at the top of [`rules.js`](rules.js).

## Project structure

```
ucsc-gpa/
├── manifest.json   # Extension manifest (MV3)
├── rules.js        # Pure GPA logic, with no DOM, shared with the tests
├── content.js      # Reads the results tables and renders the panel
├── styles.css      # Panel and table styling
├── icons/          # Extension icons (16, 48, 128)
└── test/           # Rule tests and a browser fixture
```

## Permissions and privacy

- **`storage`** saves your excluded subjects and expected-result courses in your browser, keyed to your registration number.
- The content script runs only on `ucsc.cmb.ac.lk` and its subdomains.
- **No data is sent anywhere.** There are no servers, analytics or network requests.

## Development

Edit the files, then click the reload icon on the extension's card in `chrome://extensions` and refresh the portal page.

Run the rule tests with Node (no install needed):

```bash
node test/rules.test.js
```

`test/browser.test.js` and `test/delayed.test.js` use Playwright against `test/fixture.html`. Both load Playwright from a hard-coded path, so adjust it before running them.

## Disclaimer

This is an unofficial, student-made tool and isn't affiliated with the University of Colombo School of Computing. The GPA it shows is an estimate. Your official results come from the university.
