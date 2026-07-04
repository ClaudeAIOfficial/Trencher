function parseRedditUrl(url) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const commentsIndex = parts.indexOf("comments");
    return {
      subreddit: parts[1] || null,
      postId: commentsIndex >= 0 ? parts[commentsIndex + 1] || null : null,
      normalizedUrl:
        commentsIndex >= 0
          ? `https://www.reddit.com/r/${parts[1] || "all"}/comments/${parts[commentsIndex + 1] || ""}/`
          : url,
    };
  } catch (_error) {
    return { subreddit: null, postId: null, normalizedUrl: url };
  }
}

module.exports = {
  platform: "reddit",

  async extractFromUrl(url, context) {
    const parsed = parseRedditUrl(url);
    const redditData = await context.extractRedditJson(url);
    if (redditData) {
      return {
        platform: "reddit",
        postId: parsed.postId || redditData.postId,
        author: redditData.author || null,
        caption: redditData.caption || "",
        date: redditData.date || null,
        media: redditData.media || null,
        engagement: redditData.engagement || null,
        comments: redditData.comments || null,
        repostIndicators: context.detectRepostIndicators(redditData.caption || ""),
        linkedOriginalSource: context.extractLinkedSource(redditData.caption || ""),
        openGraph: redditData.openGraph || {},
        title: redditData.title || "Untitled Reddit post",
        url: parsed.normalizedUrl || url,
      };
    }

    const og = await context.extractOpenGraph(url);
    return {
      platform: "reddit",
      postId: parsed.postId,
      author: og.author || null,
      caption: og.description || "",
      date: og.publishedAt || null,
      media: og.image || null,
      engagement: context.extractEngagementFromText(og.description || ""),
      comments: null,
      repostIndicators: context.detectRepostIndicators(og.description || ""),
      linkedOriginalSource: context.extractLinkedSource(og.description || ""),
      openGraph: og.openGraph || {},
      title: og.title || "Untitled Reddit post",
      url: parsed.normalizedUrl || url,
    };
  },

  async searchPlatform(query, context) {
    return context.searchBySite("reddit", query, ["reddit.com"], "reddit");
  },

  normalizeResult(raw, context) {
    return context.normalizeSource({
      sourceType: raw.sourceType || "reddit",
      platform: "reddit",
      title: raw.title || raw.caption || "Untitled Reddit post",
      url: raw.url,
      snippet: raw.snippet || raw.caption || "",
      date: raw.date || raw.publishedAt,
      author: raw.author || null,
      image: raw.image || raw.thumbnail || null,
      metadata: raw.metadata || {},
    });
  },
};
