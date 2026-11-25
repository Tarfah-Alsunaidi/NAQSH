// Thin client for the NAQSH AI FastAPI backend. Every result shown in the interface comes from here.
async function call(url, options) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (err) {
    const e = new Error("offline");
    e.code = "offline";
    throw e;
  }
  let body = null;
  try {
    body = await response.json();
  } catch (err) {
    body = null;
  }
  if (!response.ok) {
    const detail = (body && body.detail) || {};
    const e = new Error(detail.message || `HTTP ${response.status}`);
    e.code = detail.code || `http_${response.status}`;
    e.detail = detail;
    e.status = response.status;
    throw e;
  }
  return body;
}

export const api = {
  health: () => call("/api/health"),
  inscriptions: () => call("/api/inscriptions"),
  samples: () => call("/api/samples"),
  predictFile: (file) =>
    call("/api/predict", {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    }),
  predictSample: (imageId) => call(`/api/samples/${encodeURIComponent(imageId)}/predict`, { method: "POST" }),
};

export const fmt = (x, digits = 3) => (typeof x === "number" && isFinite(x) ? x.toFixed(digits) : "—");
