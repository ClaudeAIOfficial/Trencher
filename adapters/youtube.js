function parseYoutubeUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return { videoId: id || null, normalizedUrl: id ? `https://www.youtube.com/watch?v=${id}` : url };
    }
    if (parsed.pathname.startsWith("/shorts/")) {
      const id = parsed.pathname.split("/").filter(Boolean)[1];
      return { videoId: id || null, normalizedUrl: id ? `https://www.youtube.com/shorts/${id}` : url };
    }
    const id = parsed.searchParams.get("v");
    return { videoId: id || null, normalizedUrl: id ? `https://www.youtube.com/watch?v=${id}` : url };
  } catch (_error) {
    return { videoId: null, normalizedUrl: url };
  }
}

module.exports = {
  platform: "youtube",

  async extractFromUrl(url, context) {
    const parsed = parseYoutubeUrl(url);
    const og = await context.extractOpenGraph(url);
    const caption = og.description || "";
    return {
      platform: "youtube",
      postId: parsed.videoId,
      author: og.author || null,
      caption,
      date: og.publishedAt || null,
      media: og.image || null,
      engagement: context.extractEngagementFromText(caption),
      comments: null,
      repostIndicators: context.detectRepostIndicators(caption),
      linkedOriginalSource: context.extractLinkedSource(caption),
      openGraph: og.openGraph || {},
      title: og.title || "Untitled YouTube video",
      url: parsed.normalizedUrl || url,
    };
  },

  async searchPlatform(query, context) {
    return context.searchBySite("youtube", query, ["youtube.com", "youtu.be"], "youtube");
  },

  normalizeResult(raw, context) {
    return context.normalizeSource({
      sourceType: raw.sourceType || "youtube",
      platform: "youtube",
      title: raw.title || raw.caption || "Untitled YouTube video",
      url: raw.url,
      snippet: raw.snippet || raw.caption || "",
      date: raw.date || raw.publishedAt,
      author: raw.author || null,
      image: raw.image || raw.thumbnail || null,
      metadata: raw.metadata || {},
    });
  },
};
