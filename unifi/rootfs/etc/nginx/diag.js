/*
 * UniFi ingress client-side diagnostic reporter (TEMPORARY).
 *
 * Injected into the UniFi SPA by ingress-proxy.conf to diagnose the iOS-only
 * "/manage/fatal" (mislabelled "400") crash that cannot be reproduced off-device.
 * The server only sees nginx-level traffic; the actual trigger is a client-side
 * route-resolve rejection inside iOS WebKit. This script captures that rejection
 * (and everything around it) and beacons it to the add-on's nginx error log (the
 * add-on Log tab), so the real exception is visible without a Mac, a console, or
 * Safari Web Inspector.
 *
 * Beacons are sent as GET requests to /__diag?d=<json> because this nginx build
 * has only the log-phase lua (no content_by_lua), so the sink logs the query arg.
 *
 * Every hook is try/guarded and falls through to the original behaviour, so this
 * can never break the app. Remove this file and its injection once the cause is
 * identified.
 */
(function () {
  "use strict";

  // Capture native primitives BEFORE we wrap fetch/XHR below, so our own beacons
  // never re-enter the hooks (which would recurse/flood).
  var NATIVE_FETCH = window.fetch ? window.fetch.bind(window) : null;
  var NATIVE_IMAGE = window.Image;

  // Derive the ingress prefix from this script's own URL.
  var PREFIX = "";
  try {
    var me = document.currentScript && document.currentScript.src;
    if (me) PREFIX = new URL(me, location.href).pathname.replace(/\/__diag\.js.*$/, "");
  } catch (e) { /* leave empty */ }
  var SINK = PREFIX + "/__diag";

  var seq = 0;
  var startedAt = Date.now();
  var MAX = 6000; // keep the GET URL under nginx's header buffer

  function emit(kind, data) {
    var payload;
    try {
      payload = JSON.stringify({
        seq: seq++,
        ms: Date.now() - startedAt,
        kind: kind,
        url: location.href,
        framed: (function () { try { return window.top !== window.self; } catch (e) { return "cross-origin-top"; } })(),
        data: data
      });
    } catch (e) {
      payload = JSON.stringify({ seq: seq++, kind: kind, serializeError: String(e) });
    }
    if (payload.length > MAX) payload = payload.slice(0, MAX) + "...[TRUNC]";
    var u = SINK + "?d=" + encodeURIComponent(payload);
    try { if (NATIVE_FETCH) { NATIVE_FETCH(u, { method: "GET", cache: "no-store", keepalive: true }); return; } } catch (e) { /* fall through */ }
    try { var img = new NATIVE_IMAGE(); img.src = u; } catch (e) { /* give up */ }
  }

  function probe(fn) {
    try { return { ok: true, value: fn() }; }
    catch (e) { return { ok: false, error: String((e && e.name) || "") + ": " + String((e && e.message) || e) }; }
  }

  // ---- 1. Environment + storage capability snapshot -----------------------
  emit("env", {
    ua: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    isSecureContext: window.isSecureContext,
    cookieEnabled: navigator.cookieEnabled,
    referrer: document.referrer,
    readyState: document.readyState,
    visibility: document.visibilityState,
    hasCryptoSubtle: !!(window.crypto && window.crypto.subtle),
    hasServiceWorker: ("serviceWorker" in navigator),
    storage: {
      localStorage: probe(function () { var k = "__diagls"; window.localStorage.setItem(k, "1"); var v = window.localStorage.getItem(k); window.localStorage.removeItem(k); return v === "1" ? "rw" : "ro?"; }),
      sessionStorage: probe(function () { var k = "__diagss"; window.sessionStorage.setItem(k, "1"); var v = window.sessionStorage.getItem(k); window.sessionStorage.removeItem(k); return v === "1" ? "rw" : "ro?"; }),
      cookieRead: probe(function () { return "len=" + document.cookie.length; }),
      cookieWrite: probe(function () { document.cookie = "__diagck=1;path=/"; var ok = document.cookie.indexOf("__diagck=1") !== -1; document.cookie = "__diagck=;path=/;max-age=0"; return ok ? "rw" : "blocked"; }),
      indexedDB: probe(function () { return window.indexedDB ? "present" : "missing"; }),
      caches: probe(function () { return ("caches" in window) ? "present" : "missing"; })
    }
  });

  // ---- 2. Uncaught errors --------------------------------------------------
  window.addEventListener("error", function (e) {
    emit("window.error", {
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      stack: (e.error && e.error.stack) ? String(e.error.stack).slice(0, 1800) : null,
      name: (e.error && e.error.name) || null
    });
  }, true);

  // ---- 3. Unhandled promise rejections (Angular $q resolve failures) -------
  window.addEventListener("unhandledrejection", function (e) {
    var r = e.reason;
    emit("unhandledrejection", {
      message: (r && r.message) ? r.message : String(r),
      name: (r && r.name) || null,
      status: (r && typeof r.status !== "undefined") ? r.status : null,
      stack: (r && r.stack) ? String(r.stack).slice(0, 1800) : null,
      keys: (r && typeof r === "object") ? Object.keys(r).slice(0, 20) : null
    });
  });

  // ---- 4. CSP violations (would block this script or the beacon) ----------
  window.addEventListener("securitypolicyviolation", function (e) {
    emit("csp", { violatedDirective: e.violatedDirective, blockedURI: e.blockedURI, sourceFile: e.sourceFile, lineNumber: e.lineNumber });
  });

  // ---- 5. The SPA logs its own fatal transition; capture it verbatim ------
  //    base.js: console.error("$stateChangeError: ", {fromState,toState})
  //             console.error("$stateChangeError error", p)  <-- p is the cause
  ["error", "warn"].forEach(function (level) {
    var orig = console[level];
    console[level] = function () {
      try {
        var args = Array.prototype.slice.call(arguments);
        var head = args.length ? String(args[0]) : "";
        if (head.indexOf("$stateChangeError") !== -1 || head.toLowerCase().indexOf("fatal") !== -1) {
          emit("console." + level, {
            args: args.map(function (a) {
              if (a instanceof Error) return { __error: true, name: a.name, message: a.message, stack: String(a.stack).slice(0, 1800) };
              if (a && typeof a === "object") {
                try { return JSON.parse(JSON.stringify(a)); }
                catch (e) { return { __unserializable: true, keys: Object.keys(a).slice(0, 20), status: a.status, message: a.message, str: String(a) }; }
              }
              return a;
            })
          });
        }
      } catch (e) { /* ignore */ }
      return orig.apply(console, arguments);
    };
  });

  // ---- 6. Network: fetch + XHR (which API call precedes the fatal route) --
  if (window.fetch) {
    var origFetch = window.fetch;
    window.fetch = function (input, init) {
      var url = (typeof input === "string") ? input : (input && input.url);
      if (String(url).indexOf("/__diag") !== -1) return origFetch.apply(this, arguments);
      var method = (init && init.method) || (input && input.method) || "GET";
      var t0 = Date.now();
      return origFetch.apply(this, arguments).then(function (res) {
        emit("fetch", { method: method, url: String(url), status: res.status, ms: Date.now() - t0 });
        return res;
      }, function (err) {
        emit("fetch.error", { method: method, url: String(url), error: String((err && err.message) || err), ms: Date.now() - t0 });
        throw err;
      });
    };
  }
  if (window.XMLHttpRequest) {
    var open = XMLHttpRequest.prototype.open;
    var xsend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (m, u) { this.__diag = { method: m, url: u, t0: Date.now() }; return open.apply(this, arguments); };
    XMLHttpRequest.prototype.send = function () {
      var self = this;
      try {
        if (!self.__diag || String(self.__diag.url).indexOf("/__diag") === -1) {
          this.addEventListener("loadend", function () {
            if (self.__diag) emit("xhr", { method: self.__diag.method, url: String(self.__diag.url), status: self.status, ms: Date.now() - self.__diag.t0 });
          });
        }
      } catch (e) { /* ignore */ }
      return xsend.apply(this, arguments);
    };
  }

  // ---- 7. Navigation: catch the login -> fatal transition -----------------
  function note(kind) { return function () { emit("nav." + kind, { to: location.href }); }; }
  window.addEventListener("hashchange", note("hashchange"));
  window.addEventListener("popstate", note("popstate"));
  try {
    ["pushState", "replaceState"].forEach(function (name) {
      var orig = history[name];
      history[name] = function () {
        var r = orig.apply(this, arguments);
        try { emit("nav." + name, { to: location.href }); } catch (e) {}
        return r;
      };
    });
  } catch (e) { /* ignore */ }

  // ---- 8. Heartbeat: snapshot the URL for ~30s so we see where it lands ----
  var beats = 0;
  var hb = setInterval(function () {
    beats++;
    var onFatal = location.href.indexOf("/fatal") !== -1;
    emit("heartbeat", { url: location.href, onFatal: onFatal });
    if (beats >= 15 || onFatal) clearInterval(hb);
  }, 2000);

  emit("boot", { installed: true });
})();
