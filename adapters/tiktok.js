function parseTikTokUrl(url) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const atPart = parts.find((part) => part.startsWith("@"));
    const videoIndex = parts.indexOf("video");
    return {
      handle: atPart ? atPart.replace(/^@/, "") : null,
      postId: videoIndex >= 0 ? parts[videoIndex + 1] || null : null,
      normalizedUrl:
        atPart && videoIndex >= 0
          ? `https://www.tiktok.com/@${atPart.replace(/^@/, "")}/video/${parts[videoIndex + 1]}`
          : url,
    };
  } catch (_error) {
    return { handle: null, postId: null, normalizedUrl: url };
  }
}

module.exports = {
  platform: "tiktok",

  async extractFromUrl(url, context) {
    const parsed = parseTikTokUrl(url);
    const og = await context.extractOpenGraph(url);
    const caption = og.description || "";
    return {
      platform: "tiktok",
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
      title: og.title || "Untitled TikTok",
      url: parsed.normalizedUrl || url,
    };
  },

  async searchPlatform(query, context) {
    return context.searchBySite("tiktok", query, ["tiktok.com"], "tiktok");
  },

  normalizeResult(raw, context) {
    return context.normalizeSource({
      sourceType: raw.sourceType || "tiktok",
      platform: "tiktok",
      title: raw.title || raw.caption || "Untitled TikTok",
      url: raw.url,
      snippet: raw.snippet || raw.caption || "",
      date: raw.date || raw.publishedAt,
      author: raw.author || null,
      image: raw.image || raw.thumbnail || null,
      metadata: raw.metadata || {},
    });
  },
};
