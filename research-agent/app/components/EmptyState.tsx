export default function EmptyState() {
  return (
    <div className="w-full max-w-2xl mx-auto mt-16 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-zinc-800/50 border border-zinc-700/50 mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-9 w-9 text-zinc-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      </div>

      <h2 className="text-xl font-semibold text-white mb-2">
        Start your research
      </h2>
      <p className="text-zinc-500 text-sm leading-relaxed max-w-md mx-auto">
        Enter any topic above — a trend, person, company, keyword, or question —
        and the agent will search the web, analyze multiple sources, and produce
        a structured research report.
      </p>

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
        {[
          { icon: "🌐", label: "Web articles & news" },
          { icon: "📊", label: "Multi-source comparison" },
          { icon: "🔍", label: "Key findings extraction" },
          { icon: "⚠️", label: "Conflict detection" },
          { icon: "📅", label: "Timeline reconstruction" },
          { icon: "💡", label: "Insights & opportunities" },
        ].map(({ icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-3 py-2.5 text-xs text-zinc-400"
          >
            <span>{icon}</span>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
