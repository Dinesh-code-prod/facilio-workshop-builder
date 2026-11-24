/* Delivery Studio bridge for the Excel Data Onboarding tool.
   - Keeps each project's work separate: the tool's browser-storage keys get the project id appended.
   - Sends the saved work to the Delivery Studio (same origin), which stores it on the project on the server.
   The tool's own code is unchanged. */
(function () {
  "use strict";
  var pid = new URLSearchParams(location.search).get("p") || "";
  var host = null; try { host = window.parent !== window ? window.parent : null; } catch (e) {}
  var KEY = /^facilio-onboarding-workspace-v[12]$/;
  var ns = function (k) { return pid && KEY.test(k) ? k + ":" + pid : k; };
  var P = Storage.prototype, get = P.getItem, set = P.setItem, rem = P.removeItem, timer = null, fails = 0, LIMIT = 1900000;   /* the project copy holds up to 2,000,000 characters (work/server/api.mjs) */
  P.getItem = function (k) { return get.call(this, ns(k)); };
  P.removeItem = function (k) { return rem.call(this, ns(k)); };
  P.setItem = function (k, v) { set.call(this, ns(k), v); if (this === window.localStorage && /workspace-v2$/.test(k)) { try { set.call(this, "facilio-onboarding-dirty:" + pid, "1"); } catch (e) {} schedule(); } };
  function schedule() { clearTimeout(timer); timer = setTimeout(push, 1500); }
  function status(t) { var el = document.getElementById("saveState"); if (el && t) el.textContent = t; }
  function push() {
    clearTimeout(timer);
    var raw = get.call(window.localStorage, "facilio-onboarding-workspace-v2:" + pid);
    if (!raw || !host || typeof host.FWBOnbSave !== "function") return;
    if (raw.length > LIMIT || /^\{"v":2,"idb":true/.test(raw)) { status("Saved in this browser only: the workbook is larger than the 2 MB project copy. Download it to share or keep it."); return; }
    host.FWBOnbSave(pid, raw).then(function (ok) { fails = ok ? 0 : fails + 1;
      status(ok ? "Saved to the project · " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : fails < 4 ? "Saved in this browser only. Will retry." : "Saved in this browser only: the project copy failed. Download the workbook to keep it.");
      if (!ok && fails < 4) timer = setTimeout(push, 15000); });
  }
  window.addEventListener("pagehide", function () { if (get.call(window.localStorage, "facilio-onboarding-dirty:" + pid)) push(); });
  window.FWBBridge = { push: push };
})();
