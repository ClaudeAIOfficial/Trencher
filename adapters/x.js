function parseXUrl(url) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const statusIndex = parts.indexOf("status");
    return {
      handle: parts[0] || null,
      postId: statusIndex >= 0 ? parts[statusIndex + 1] || null : null,
      normalizedUrl: `https://x.com/${parts[0] || ""}${statusIndex >= 0 ? `/status/${parts[statusIndex + 1]}` : ""}`,
    };
  } catch (_error) {
    return { handle: null, postId: null, normalizedUrl: url };
  }
}

module.exports = {
  platform: "x",

  async extractFromUrl(url, context) {
    const parsed = parseXUrl(url);
    const og = await context.extractOpenGraph(url);
    const caption = og.description || "";
    return {
      platform: "x",
      postId: parsed.postId,
      author: parsed.handle ? `@${parsed.handle}` : og.author || null,
      caption,
      date: og.publishedAt || null,
      media: og.image || null,
      engagement: context.extractEngagementFromText(caption),
      comments: null,
      repostIndicators: context.detectRepostIndicators(caption),
      linkedOriginalSource: context.extractLinkedSource(caption),
      openGraph: og.openGraph || {},
      title: og.title || "Untitled X post",
      url: parsed.normalizedUrl || url,
    };
  },

  async searchPlatform(query, context) {
    return context.searchBySite("x", query, ["x.com", "twitter.com"], "x");
  },

  normalizeResult(raw, context) {
    return context.normalizeSource({
      sourceType: raw.sourceType || "x",
      platform: "x",
      title: raw.title || raw.caption || "Untitled X post",
      url: raw.url,
      snippet: raw.snippet || raw.caption || "",
      date: raw.date || raw.publishedAt,
      author: raw.author || null,
      image: raw.image || raw.thumbnail || null,
      metadata: raw.metadata || {},
    });
  },
};
