function parseInstagramUrl(url) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const type = parts[0] || null;
    const postId = parts[1] || null;
    return {
      postId,
      type,
      normalizedUrl: type && postId ? `https://www.instagram.com/${type}/${postId}/` : url,
    };
  } catch (_error) {
    return { postId: null, type: null, normalizedUrl: url };
  }
}

module.exports = {
  platform: "instagram",

  async extractFromUrl(url, context) {
    const parsed = parseInstagramUrl(url);
    const og = await context.extractOpenGraph(url);
    const caption = og.description || "";
    return {
      platform: "instagram",
      postId: parsed.postId,
      author: og.author || null,
      caption,
      date: og.publishedAt || null,
      media: og.image || null,
      engagement: context.extractEngagementFromText(caption),
      comments: null,
      repostIndicators: context.detectRepostIndicators(caption),
      linkedOriginalSource: context.extractLinkedSource(caption),
      openGraph: og.openGraph || {},
      title: og.title || "Untitled Instagram post",
      url: parsed.normalizedUrl || url,
    };
  },

  async searchPlatform(query, context) {
    return context.searchBySite("instagram", query, ["instagram.com"], "instagram");
  },

  normalizeResult(raw, context) {
    return context.normalizeSource({
      sourceType: raw.sourceType || "instagram",
      platform: "instagram",
      title: raw.title || raw.caption || "Untitled Instagram post",
      url: raw.url,
      snippet: raw.snippet || raw.caption || "",
      date: raw.date || raw.publishedAt,
      author: raw.author || null,
      image: raw.image || raw.thumbnail || null,
      metadata: raw.metadata || {},
    });
  },
};
