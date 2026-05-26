const VISITOR_SESSION_KEY = "realEstateVisitorSessionId";

function getVisitorSessionId() {
  let id = localStorage.getItem(VISITOR_SESSION_KEY);

  if (!id) {
    id = "v_" + Date.now() + "_" + Math.random().toString(16).slice(2);
    localStorage.setItem(VISITOR_SESSION_KEY, id);
  }

  return id;
}

async function sendVisitorHeartbeat() {
  if (!CONFIG || !CONFIG.API_URL) return;

  try {
    await fetch(CONFIG.API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        action: "trackVisitor",
        visitor_session_id: getVisitorSessionId(),
        page: location.pathname.split("/").pop() || "index.html",
        path: location.pathname,
        title: document.title || "",
        user_agent: navigator.userAgent || "",
        referrer: document.referrer || ""
      })
    });
  } catch (_) {}
}

function startVisitorTracking() {
  sendVisitorHeartbeat();
  setInterval(sendVisitorHeartbeat, 30000);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) sendVisitorHeartbeat();
  });
}

document.addEventListener("DOMContentLoaded", startVisitorTracking);
