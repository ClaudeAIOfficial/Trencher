function extractPostIdFromUrl(url) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1] : null;
  } catch (_error) {
    return null;
  }
}

module.exports = {
  platform: "generic",

  async extractFromUrl(url, context) {
    const generic = await context.extractOpenGraph(url);
    return {
      platform: "generic",
      postId: extractPostIdFromUrl(url),
      author: generic.author || null,
      caption: generic.description || "",
      date: generic.publishedAt || null,
      media: generic.image || null,
      engagement: null,
      comments: null,
      repostIndicators: [],
      linkedOriginalSource: context.extractLinkedSource(generic.description || ""),
      openGraph: generic.openGraph || {},
      title: generic.title || "Untitled",
      url: generic.url || url,
    };
  },

  async searchPlatform(query, context) {
    return context.searchBySite("web", query, ["web"], "generic");
  },

  normalizeResult(raw, context) {
    return context.normalizeSource({
      sourceType: raw.sourceType || "generic",
      platform: raw.platform || "web",
      title: raw.title,
      url: raw.url,
      snippet: raw.snippet || raw.caption || "",
      date: raw.date || raw.publishedAt,
      author: raw.author || null,
      image: raw.image || raw.thumbnail || null,
      metadata: raw.metadata || {},
    });
  },
};
