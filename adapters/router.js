const xAdapter = require("./x");
const tiktokAdapter = require("./tiktok");
const instagramAdapter = require("./instagram");
const facebookAdapter = require("./facebook");
const redditAdapter = require("./reddit");
const youtubeAdapter = require("./youtube");
const genericAdapter = require("./generic");

const SOCIAL_PLATFORMS = ["x", "tiktok", "instagram", "facebook", "reddit", "youtube"];

const adapterByPlatform = {
  x: xAdapter,
  tiktok: tiktokAdapter,
  instagram: instagramAdapter,
  facebook: facebookAdapter,
  reddit: redditAdapter,
  youtube: youtubeAdapter,
  generic: genericAdapter,
};

function getPlatformFromUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("x.com") || host.includes("twitter.com")) return "x";
    if (host.includes("tiktok.com")) return "tiktok";
    if (host.includes("instagram.com")) return "instagram";
    if (host.includes("facebook.com") || host.includes("fb.watch")) return "facebook";
    if (host.includes("reddit.com") || host.includes("redd.it")) return "reddit";
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
    return "generic";
  } catch (_error) {
    return "generic";
  }
}

function getAdapterForUrl(url) {
  const platform = getPlatformFromUrl(url);
  return adapterByPlatform[platform] || genericAdapter;
}

function getAdapterByPlatform(platform) {
  return adapterByPlatform[platform] || genericAdapter;
}

function getSocialAdapters() {
  return SOCIAL_PLATFORMS.map((platform) => adapterByPlatform[platform]);
}

module.exports = {
  SOCIAL_PLATFORMS,
  getPlatformFromUrl,
  getAdapterForUrl,
  getAdapterByPlatform,
  getSocialAdapters,
};
