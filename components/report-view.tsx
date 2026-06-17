import { toMarkdownReport } from "@/lib/research/markdown";
import { ResearchReport } from "@/lib/research/types";

interface ReportViewProps {
  report: ResearchReport;
}

function SectionList({ items, fallback }: { items: string[]; fallback: string }) {
  if (items.length === 0) {
    return <li>{fallback}</li>;
  }
  return (
    <>
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </>
  );
}

export function ReportView({ report }: ReportViewProps) {
  async function handleCopy(): Promise<void> {
    await navigator.clipboard.writeText(toMarkdownReport(report));
  }

  function handleDownload(): void {
    const blob = new Blob([toMarkdownReport(report)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${report.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-report.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-white">Research Report</h2>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/20"
          >
            Copy report
          </button>
          <button
            onClick={handleDownload}
            className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20"
          >
            Export markdown
          </button>
        </div>
      </div>

      <div className="space-y-6 text-zinc-100">
        <div>
          <h3 className="mb-2 text-xl font-semibold"># Research Report: {report.topic}</h3>
        </div>

        <div>
          <h4 className="mb-2 text-lg font-semibold">Executive Summary</h4>
          <p className="text-zinc-200">{report.summary}</p>
        </div>

        <div>
          <h4 className="mb-2 text-lg font-semibold">Key Findings</h4>
          <ul className="list-disc space-y-1 pl-5 text-zinc-200">
            <SectionList items={report.keyFindings} fallback="No key findings extracted." />
          </ul>
        </div>

        <div>
          <h4 className="mb-2 text-lg font-semibold">Timeline</h4>
          <ul className="list-disc space-y-1 pl-5 text-zinc-200">
            <SectionList items={report.timeline} fallback="No timeline evidence found." />
          </ul>
        </div>

        <div>
          <h4 className="mb-2 text-lg font-semibold">Conflicting Information</h4>
          <ul className="list-disc space-y-1 pl-5 text-zinc-200">
            <SectionList items={report.conflicts} fallback="No direct conflicts detected." />
          </ul>
        </div>

        <div>
          <h4 className="mb-2 text-lg font-semibold">Opportunities / Insights</h4>
          <ul className="list-disc space-y-1 pl-5 text-zinc-200">
            <SectionList items={report.opportunities} fallback="No clear opportunities identified." />
          </ul>
        </div>

        <div>
          <h4 className="mb-2 text-lg font-semibold">Final Verdict</h4>
          <p className="text-zinc-200">{report.finalVerdict}</p>
        </div>

        <p className="inline-flex rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-sm font-medium text-violet-200">
          Confidence: {report.confidence}
        </p>
      </div>
    </section>
  );
}
