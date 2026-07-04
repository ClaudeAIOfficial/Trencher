const fs = require("fs");
const path = require("path");
const { startServer } = require("../server");

const ROOT = path.resolve(__dirname, "..");
const CASES_DIR = path.join(ROOT, "tests", "cases");
const REPORT_JSON = path.join(ROOT, "eval-report.json");
const REPORT_HTML = path.join(ROOT, "eval-report.html");
const EVAL_PORT = Number(process.env.EVAL_PORT || 3101);
const BASE_URL = process.env.EVAL_BASE_URL || `http://localhost:${EVAL_PORT}`;

function normalize(v) {
  return String(v || "").toLowerCase().trim();
}

function scoreName(expected, actual) {
  if (!expected) return { score: 1, matched: true, note: "no expected name" };
  const ex = normalize(expected);
  const ac = normalize(actual);
  const matched = ac.includes(ex) || ex.includes(ac);
  return { score: matched ? 1 : 0, matched, note: matched ? "matched" : "not matched" };
}

function scoreSource(expectedUrl, actualText) {
  if (!expectedUrl) return { score: 0.5, matched: false, note: "source unknown in testcase" };
  const matched = normalize(actualText).includes(normalize(expectedUrl));
  return { score: matched ? 1 : 0, matched, note: matched ? "matched" : "not matched" };
}

function scorePlatform(expectedPlatform, result) {
  if (!expectedPlatform) return { score: 0.5, matched: false, note: "platform unknown in testcase" };
  const observed = normalize(result?.extractedPost?.platform || result?.bestLinks?.[0]?.platform || "");
  const matched = observed.includes(normalize(expectedPlatform));
  return { score: matched ? 1 : 0, matched, note: `${matched ? "matched" : "not matched"} (${observed || "none"})` };
}

function scoreKeywords(keywords, result) {
  if (!keywords || !keywords.length) return { score: 1, matchedCount: 0, note: "no keyword requirement" };
  const haystack = normalize(
    [result?.lore || "", ...(result?.bestLinks || []).map((l) => l.snippet || ""), result?.whatItIs || ""].join(" "),
  );
  const matchedCount = keywords.filter((kw) => haystack.includes(normalize(kw))).length;
  return { score: matchedCount / keywords.length, matchedCount, note: `${matchedCount}/${keywords.length}` };
}

function scoreConfidenceCalibration(testCase, result, sourceScore) {
  const confidence = Number(result?.confidenceScore || 0);
  if (!testCase.expectedOriginalSourceUrl) {
    if (confidence <= 75) return { score: 1, note: "uncertain case confidence acceptable" };
    return { score: 0.3, note: "confidence too high for uncertain-origin case" };
  }
  if (sourceScore.matched && confidence >= 60) return { score: 1, note: "confidence aligned with source match" };
  if (!sourceScore.matched && confidence >= 75) return { score: 0, note: "high confidence despite source miss" };
  return { score: 0.5, note: "mixed confidence calibration" };
}

function scoreSpeed(ms) {
  if (ms <= 4000) return { score: 1, note: "fast" };
  if (ms <= 8000) return { score: 0.75, note: "okay" };
  if (ms <= 15000) return { score: 0.4, note: "slow" };
  return { score: 0.1, note: "very slow" };
}

function statusFromScore(total, sourceExpected, sourceMatched, confidenceScore) {
  if (sourceExpected && sourceMatched && total >= 0.8) return "passed";
  if (!sourceExpected && total >= 0.7 && confidenceScore < 80) return "partial";
  if (total >= 0.45) return "partial";
  return "failed";
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function runCase(testCase) {
  const form = new FormData();
  if (testCase.inputValue) form.append("input", testCase.inputValue);
  if (testCase.filePath) {
    const absolute = path.isAbsolute(testCase.filePath)
      ? testCase.filePath
      : path.join(ROOT, testCase.filePath);
    const buffer = fs.readFileSync(absolute);
    const blob = new Blob([buffer], { type: "image/png" });
    form.append("file", blob, path.basename(absolute));
  }

  const started = Date.now();
  const response = await fetch(`${BASE_URL}/api/research`, { method: "POST", body: form });
  const elapsedMs = Date.now() - started;
  const payload = await response.json();
  if (!response.ok) {
    return {
      id: testCase.id,
      status: "failed",
      error: payload.error || "research failed",
      responseTimeMs: elapsedMs,
      expected: testCase,
      actual: null,
      scores: {},
      missingPieces: ["API request failed"],
    };
  }

  const result = payload.result || {};
  const nameScore = scoreName(testCase.expectedName, result.name);
  const sourceScore = scoreSource(testCase.expectedOriginalSourceUrl, result.originalSource);
  const platformScore = scorePlatform(testCase.expectedPlatform, result);
  const keywordScore = scoreKeywords(testCase.expectedKeywords || [], result);
  const calibrationScore = scoreConfidenceCalibration(testCase, result, sourceScore);
  const speedScore = scoreSpeed(elapsedMs);

  const weighted =
    nameScore.score * 0.2 +
    sourceScore.score * 0.25 +
    platformScore.score * 0.15 +
    keywordScore.score * 0.2 +
    calibrationScore.score * 0.1 +
    speedScore.score * 0.1;

  const status = statusFromScore(
    weighted,
    Boolean(testCase.expectedOriginalSourceUrl),
    sourceScore.matched,
    Number(result.confidenceScore || 0),
  );

  const missingPieces = [];
  if (!nameScore.matched) missingPieces.push("name mismatch");
  if (testCase.expectedOriginalSourceUrl && !sourceScore.matched) missingPieces.push("original source mismatch");
  if (testCase.expectedPlatform && !platformScore.matched) missingPieces.push("platform mismatch");
  if ((testCase.expectedKeywords || []).length && keywordScore.score < 0.5) missingPieces.push("weak lore keyword coverage");
  if (calibrationScore.score < 0.5) missingPieces.push("confidence calibration issue");
  if (speedScore.score < 0.5) missingPieces.push("slow response time");

  return {
    id: testCase.id,
    status,
    responseTimeMs: elapsedMs,
    expected: testCase,
    actual: {
      name: result.name,
      originalSource: result.originalSource,
      platform: result.extractedPost?.platform || result.bestLinks?.[0]?.platform || null,
      lore: result.lore,
      confidenceScore: result.confidenceScore,
      sourceQuality: result.sourceQuality,
      verdict: result.verdict,
    },
    scores: {
      total: Number(weighted.toFixed(3)),
      name: nameScore,
      source: sourceScore,
      platform: platformScore,
      keywords: keywordScore,
      confidenceCalibration: calibrationScore,
      speed: speedScore,
    },
    missingPieces,
  };
}

function loadCases() {
  const files = fs.readdirSync(CASES_DIR).filter((file) => file.endsWith(".json"));
  return files.map((file) => {
    const raw = fs.readFileSync(path.join(CASES_DIR, file), "utf8");
    return JSON.parse(raw);
  });
}

function writeHtmlReport(summary) {
  const rows = summary.results
    .map((row) => {
      return `<tr>
  <td>${escapeHtml(row.id)}</td>
  <td>${escapeHtml(row.status)}</td>
  <td>${row.responseTimeMs}ms</td>
  <td>${escapeHtml(row.actual?.name || row.error || "N/A")}</td>
  <td>${escapeHtml(row.expected.expectedName || "N/A")}</td>
  <td>${escapeHtml(String(row.actual?.confidenceScore ?? "N/A"))}</td>
  <td>${escapeHtml(row.actual?.sourceQuality || "N/A")}</td>
  <td>${escapeHtml((row.missingPieces || []).join(", ") || "none")}</td>
</tr>`;
    })
    .join("\n");

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Viral Lore Agent Eval Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; background: #f7f9fc; }
    table { border-collapse: collapse; width: 100%; background: #fff; }
    th, td { border: 1px solid #ddd; padding: 8px; font-size: 14px; vertical-align: top; }
    th { background: #1f4bd6; color: #fff; text-align: left; }
    .summary { margin-bottom: 16px; }
  </style>
</head>
<body>
  <h1>Viral Lore Agent Evaluation Report</h1>
  <div class="summary">
    <p>Total: ${summary.totalCases}</p>
    <p>Passed: ${summary.passed}</p>
    <p>Partial: ${summary.partial}</p>
    <p>Failed: ${summary.failed}</p>
    <p>Average Score: ${summary.averageScore}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Case</th><th>Status</th><th>Response Time</th><th>Agent Answer</th><th>Expected</th><th>Confidence</th><th>Source Quality</th><th>Missing Pieces</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`;
  fs.writeFileSync(REPORT_HTML, html);
}

async function main() {
  const server = startServer(EVAL_PORT);
  const cases = loadCases();
  const results = [];
  for (const testCase of cases) {
    // Keep sequential execution to avoid rate-limit spikes in external providers.
    const result = await runCase(testCase);
    results.push(result);
    console.log(`${result.status.toUpperCase()} ${result.id} (${result.responseTimeMs}ms)`);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    totalCases: results.length,
    passed: results.filter((r) => r.status === "passed").length,
    partial: results.filter((r) => r.status === "partial").length,
    failed: results.filter((r) => r.status === "failed").length,
    averageScore: Number(
      (results.reduce((acc, row) => acc + (row.scores?.total || 0), 0) / Math.max(1, results.length)).toFixed(3),
    ),
    results,
  };

  fs.writeFileSync(REPORT_JSON, JSON.stringify(summary, null, 2));
  writeHtmlReport(summary);
  console.log(`Saved ${REPORT_JSON}`);
  console.log(`Saved ${REPORT_HTML}`);
  await new Promise((resolve) => server.close(resolve));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
