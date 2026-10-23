/* Workshop Builder bridge for the Excel Data Onboarding tool.
   - Keeps each project's work separate: the tool's browser-storage keys get the project id appended.
   - Sends the saved work to the Workshop Builder (same origin), which stores it on the project on the server.
   The tool's own code is unchanged. */
(function () {
  "use strict";
  var pid = new URLSearchParams(location.search).get("p") || "";
  var host = null; try { host = window.parent !== window ? window.parent : null; } catch (e) {}
  var KEY = /^facilio-onboarding-workspace-v[12]$/;
  var ns = function (k) { return pid && KEY.test(k) ? k + ":" + pid : k; };
  var P = Storage.prototype, get = P.getItem, set = P.setItem, rem = P.removeItem, timer = null;
  P.getItem = function (k) { return get.call(this, ns(k)); };
  P.removeItem = function (k) { return rem.call(this, ns(k)); };
  P.setItem = function (k, v) { set.call(this, ns(k), v); if (this === window.localStorage && /workspace-v2$/.test(k)) { try { set.call(this, "facilio-onboarding-dirty:" + pid, "1"); } catch (e) {} schedule(); } };
  function schedule() { clearTimeout(timer); timer = setTimeout(push, 1500); }
  function status(t) { var el = document.getElementById("saveState"); if (el && t) el.textContent = t; }
  function push() {
    clearTimeout(timer);
    var raw = get.call(window.localStorage, "facilio-onboarding-workspace-v2:" + pid);
    if (!raw || !host || typeof host.FWBOnbSave !== "function") return;
    host.FWBOnbSave(pid, raw).then(function (ok) { status(ok ? "Saved to the project · " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Saved in this browser only. Will retry."); if (!ok) timer = setTimeout(push, 15000); });
  }
  window.addEventListener("pagehide", function () { if (get.call(window.localStorage, "facilio-onboarding-dirty:" + pid)) push(); });
  window.FWBBridge = { push: push };
})();
