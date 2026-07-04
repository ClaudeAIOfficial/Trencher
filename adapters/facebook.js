function parseFacebookUrl(url) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const postIndex = parts.indexOf("posts");
    let postId = postIndex >= 0 ? parts[postIndex + 1] || null : null;
    if (!postId && parsed.searchParams.get("story_fbid")) {
      postId = parsed.searchParams.get("story_fbid");
    }
    return {
      page: parts[0] || null,
      postId,
      normalizedUrl: postId && parts[0] ? `https://www.facebook.com/${parts[0]}/posts/${postId}` : url,
    };
  } catch (_error) {
    return { page: null, postId: null, normalizedUrl: url };
  }
}

module.exports = {
  platform: "facebook",

  async extractFromUrl(url, context) {
    const parsed = parseFacebookUrl(url);
    const og = await context.extractOpenGraph(url);
    const caption = og.description || "";
    return {
      platform: "facebook",
      postId: parsed.postId,
      author: parsed.page || og.author || null,
      caption,
      date: og.publishedAt || null,
      media: og.image || null,
      engagement: context.extractEngagementFromText(caption),
      comments: null,
      repostIndicators: context.detectRepostIndicators(caption),
      linkedOriginalSource: context.extractLinkedSource(caption),
      openGraph: og.openGraph || {},
      title: og.title || "Untitled Facebook post",
      url: parsed.normalizedUrl || url,
    };
  },

  async searchPlatform(query, context) {
    return context.searchBySite("facebook", query, ["facebook.com"], "facebook");
  },

  normalizeResult(raw, context) {
    return context.normalizeSource({
      sourceType: raw.sourceType || "facebook",
      platform: "facebook",
      title: raw.title || raw.caption || "Untitled Facebook post",
      url: raw.url,
      snippet: raw.snippet || raw.caption || "",
      date: raw.date || raw.publishedAt,
      author: raw.author || null,
      image: raw.image || raw.thumbnail || null,
      metadata: raw.metadata || {},
    });
  },
};
