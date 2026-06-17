import { ResearchSource } from "@/lib/research/types";

interface SourceCardProps {
  source: ResearchSource;
  index: number;
}

export function SourceCard({ source, index }: SourceCardProps) {
  return (
    <article className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-white sm:text-base">
          {index + 1}. {source.title}
        </h3>
        <span className="rounded-full bg-cyan-500/20 px-2 py-1 text-xs font-medium text-cyan-200">
          {source.relevanceScore}/10
        </span>
      </div>

      <div className="mb-3 space-y-1 text-xs text-zinc-300">
        <p>
          <span className="font-medium text-zinc-100">Source:</span>{" "}
          {source.source || "Unknown source"}
        </p>
        <p>
          <span className="font-medium text-zinc-100">Author:</span> {source.author || "Unknown"}
        </p>
        <p>
          <span className="font-medium text-zinc-100">Date:</span>{" "}
          {source.publishedDate || "Unknown"}
        </p>
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="line-clamp-1 text-cyan-300 underline decoration-cyan-700 underline-offset-2"
        >
          {source.url}
        </a>
      </div>

      <p className="mb-3 text-sm text-zinc-100">{source.summary || "No summary available."}</p>
      <ul className="mb-3 list-disc space-y-1 pl-4 text-xs text-zinc-300">
        {source.mainClaims.length > 0 ? (
          source.mainClaims.map((claim, claimIndex) => (
            <li key={`${source.url}-claim-${claimIndex}`}>{claim}</li>
          ))
        ) : (
          <li>No main claims extracted.</li>
        )}
      </ul>

      <div className="space-y-2 text-xs text-zinc-300">
        <div>
          <p className="mb-1 font-medium text-zinc-100">Important Facts</p>
          <ul className="list-disc space-y-1 pl-4">
            {source.importantFacts.length > 0 ? (
              source.importantFacts.map((fact, factIndex) => (
                <li key={`${source.url}-fact-${factIndex}`}>{fact}</li>
              ))
            ) : (
              <li>No important facts extracted.</li>
            )}
          </ul>
        </div>

        <div>
          <p className="mb-1 font-medium text-zinc-100">Key Quotes</p>
          <ul className="list-disc space-y-1 pl-4">
            {source.keyQuotes.length > 0 ? (
              source.keyQuotes.map((quote, quoteIndex) => (
                <li key={`${source.url}-quote-${quoteIndex}`}>{quote}</li>
              ))
            ) : (
              <li>No key quotes extracted.</li>
            )}
          </ul>
        </div>
      </div>
    </article>
  );
}
