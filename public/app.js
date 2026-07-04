const form = document.getElementById("research-form");
const statusCard = document.getElementById("status-card");
const statusText = document.getElementById("status-text");
const resultCard = document.getElementById("result-card");
const formattedOutput = document.getElementById("formatted-output");
const inputTypeEl = document.getElementById("input-type");
const coverageList = document.getElementById("coverage-list");
const reverseLinks = document.getElementById("reverse-links");
const postExtract = document.getElementById("post-extract");
const ocrText = document.getElementById("ocr-text");
const bestLinksList = document.getElementById("best-links-list");
const socialStatusList = document.getElementById("social-status-list");
const confidenceBox = document.getElementById("confidence-box");
const submitBtn = document.getElementById("submit-btn");

function setStatus(message, isError = false) {
  statusCard.classList.remove("hidden");
  statusText.textContent = message;
  statusText.className = isError ? "error" : "";
}

function makeListItem(content, href = null) {
  const li = document.createElement("li");
  if (href) {
    const a = document.createElement("a");
    a.href = href;
    a.textContent = content;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    li.appendChild(a);
  } else {
    li.textContent = content;
  }
  return li;
}

function renderResult(payload) {
  const { result, formatted } = payload;
  formattedOutput.textContent = formatted;
  inputTypeEl.textContent = result.inputType;

  coverageList.innerHTML = "";
  result.coverage.forEach((item) => coverageList.appendChild(makeListItem(item)));

  reverseLinks.innerHTML = "";
  if (result.reverseImage?.hostedImageUrl) {
    reverseLinks.appendChild(makeListItem("Hosted upload", result.reverseImage.hostedImageUrl));
  }
  (result.reverseImage?.reverseSearchLinks || []).forEach((url, idx) => {
    reverseLinks.appendChild(makeListItem(`Reverse search ${idx + 1}`, url));
  });
  if (!reverseLinks.children.length) {
    reverseLinks.appendChild(makeListItem("No reverse image links for this input."));
  }

  ocrText.textContent = result.ocr?.text || "No OCR text extracted.";

  bestLinksList.innerHTML = "";
  (result.bestLinks || []).forEach((link) => {
    const details = `${link.platform || "web"} | ${link.author || "unknown author"} | ${link.date || "unknown date"} | confidence ${link.confidence}/100 (${link.originLikelihood || "low"}) | ${link.whyItMatters}`;
    bestLinksList.appendChild(makeListItem(`${link.title} — ${details}`, link.url));
  });
  if (!bestLinksList.children.length) {
    bestLinksList.appendChild(makeListItem("No ranked links available."));
  }

  socialStatusList.innerHTML = "";
  const socialStatus = result.socialSourcesChecked || {};
  ["x", "tiktok", "instagram", "facebook", "reddit", "youtube"].forEach((platform) => {
    const item = socialStatus[platform] || { status: "skipped", detail: "not searched" };
    socialStatusList.appendChild(makeListItem(`${platform}: ${item.status} (${item.detail})`));
  });

  confidenceBox.innerHTML = `
    <p><strong>Confidence Score:</strong> ${result.confidenceScore ?? "N/A"}</p>
    <p><strong>Source Quality:</strong> ${result.sourceQuality || "N/A"}</p>
    <p><strong>Reason:</strong> ${result.confidenceReason || "N/A"}</p>
  `;

  const extracted = result.extractedPost;
  if (extracted) {
    postExtract.innerHTML = `
      <p><strong>Platform:</strong> ${extracted.platform || "N/A"}</p>
      <p><strong>Post ID:</strong> ${extracted.postId || "N/A"}</p>
      <p><strong>Title:</strong> ${extracted.title || "N/A"}</p>
      <p><strong>Author:</strong> ${extracted.author || "N/A"}</p>
      <p><strong>Date:</strong> ${extracted.date || extracted.publishedAt || "N/A"}</p>
      <p><strong>URL:</strong> <a href="${extracted.url}" target="_blank" rel="noopener noreferrer">${extracted.url}</a></p>
      <p><strong>Text:</strong> ${extracted.caption || extracted.description || extracted.snippet || "N/A"}</p>
      <p><strong>Engagement:</strong> ${JSON.stringify(extracted.engagement || "N/A")}</p>
      <p><strong>Comments:</strong> ${extracted.comments || "N/A"}</p>
    `;
  } else {
    postExtract.innerHTML = "<p>No direct post extraction was performed for this input.</p>";
  }

  resultCard.classList.remove("hidden");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submitBtn.disabled = true;
  setStatus("Researching web, news, Reddit, and social-indexed sources...");
  resultCard.classList.add("hidden");

  try {
    const formData = new FormData(form);
    const response = await fetch("/api/research", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "Request failed.");
    }

    const payload = await response.json();
    setStatus("Research complete.");
    renderResult(payload);
  } catch (error) {
    setStatus(error.message || "Unexpected error.", true);
  } finally {
    submitBtn.disabled = false;
  }
});
