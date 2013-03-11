"use strict";

// Avoid slamming the IPC channel with tons of extra traffic. Batch updates.
var SEND_INTERVAL = 1000;

if (this.window && this.window === top) {
  // FIXME(slightlyoff): do we still need to do this?

  // If we're top-level, set up a persistent connection so we can notify the
  // background page of visibility changes
  var port = chrome.extension.connect({name: "display"});

  document.addEventListener("webkitvisibilitychange", function() {
    port.postMessage({ type: (document.webkitHidden) ? "hidden" : "visible" });
  }, false);

  // FIXME: need to add a listener on the port so the background page can tell
  // us when it HUP's.
}

var backlog = [];
var sendToBackground = rateLimited(function() {
  // console.log("sending:", backlog);
  chrome.extension.sendMessage(backlog);
  backlog = [];
}, SEND_INTERVAL);

var send = function(type, data) {
  // console.log("send:", type, data);
  backlog.push({
    type: type,
    data: data,
  });
  sendToBackground();
};

// Send the background page what we know aobut the page so far
send("pageload", new ElementData(elements()));

var timer = null;
var _queue = [];
var queueToSendUpdate = function(added) {
  if (timer) {
    clearTimeout(timer);
  }
  Array.prototype.push.apply(_queue, added);
  timer = setTimeout(function() {
    send("update", new ElementData(_queue));
    _queue.length = 0;
  }, 500);
};

// Capture future additions to the DOM
new WebKitMutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    if (mutation.addedNodes.length) {
      var added = toArray(mutation.addedNodes).filter(function(n) {
        return n.nodeType == 1;
      });
      if(added.length) {
        queueToSendUpdate(added);
        // send("update", new ElementData(added));
      }
    }
  });
}).observe(document.documentElement, { childList: true, subtree: true });
