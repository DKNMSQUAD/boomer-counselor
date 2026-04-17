// Send analytics events to the hub (parent window) via postMessage.
// Hub listens and forwards to Apps Script with user/location context.
const TOOL = "college-search";
export function emitEvent(name, payload = {}) {
  // Only emit when embedded in the hub iframe
  if (!window.parent || window.parent === window) return;
  try {
    window.parent.postMessage({
      type: "bc-event",
      name,
      tool: TOOL,
      action: payload.action || "",
      targetId: payload.targetId || "",
      targetLabel: payload.targetLabel || "",
      extraData: payload.extraData || null,
      timestamp: new Date().toISOString(),
    }, window.location.origin);
  } catch (e) {
    console.warn("[bcEvents] emit failed", e);
  }
}
