// Connection + freshness banner. Three connection states plus the two
// "projection not built" states, each with the command that fixes it — a
// missing projection is the app's most likely first-run condition and it should
// never look like a bug.
(function (VA) {
  "use strict";

  VA.renderBanner = function (root, state, handlers) {
    VA.clear(root);
    root.className = "banner banner--" + state.connection;

    if (state.connection === VA.STATE.DISCONNECTED) {
      root.appendChild(VA.el("span", null,
        "Connect the tolstack repo folder (C:\\workspace\\tolstack) to load the stacks. Read-only."));
      root.appendChild(button("Connect folder", "banner__action", handlers.onConnect));
    } else if (state.connection === VA.STATE.NEEDS_REGRANT) {
      root.appendChild(VA.el("span", null,
        "Chrome needs the folder permission re-granted (one click, once per browser restart)."));
      root.appendChild(button("Re-grant", "banner__action", handlers.onReconnect));
    } else {
      root.appendChild(VA.el("span", "banner__built", VA.builtLine(state.results, state.crops)));
      root.appendChild(button("Reload", "banner__action", handlers.onReload));
    }

    if (state.error) {
      root.appendChild(VA.el("div", "banner__error", state.error));
    }

    if (state.connection === VA.STATE.READY && !state.results) {
      root.appendChild(missing(
        "No results projection. The viewer renders it dumbly and computes nothing, " +
        "so without it there is nothing to show. Build it:",
        VA.CONFIG.rebuild.results));
    }
    if (state.connection === VA.STATE.READY && state.results && !state.crops) {
      root.appendChild(missing(
        "No crop projection — hovers will say \"not built\" rather than " +
        "\"unresolvable\", which are different facts. Build it (needs PyMuPDF, " +
        "so use drawing-checker's venv):",
        VA.CONFIG.rebuild.crops));
    }
    return root;
  };

  function missing(text, command) {
    var box = VA.el("div", "banner__missing");
    box.appendChild(VA.el("div", null, text));
    box.appendChild(VA.el("code", "banner__cmd", command));
    return box;
  }

  function button(label, className, onClick) {
    var node = VA.el("button", className, label);
    node.onclick = onClick;
    return node;
  }
})(window.ViewerApp = window.ViewerApp || {});
