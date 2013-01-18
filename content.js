"use strict";

var display = function(global) {
  /*
  console.log("local stats:");
  console.dir(local);
  */
  console.log("global stats:");
  console.dir(global);
};

// If we're top-level, set up a persistent connection so we can display updates
if (window === top) {
  var port = chrome.extension.connect({name: "display"});
  port.onMessage.addListener(display);
}

// Send the background page what we know aobut the page so far
chrome.extension.sendMessage({
  type: "pageload",
  data: new ElementData(elements())
});

// Capture future additions to the DOM
new WebKitMutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    if (mutation.addedNodes.length) {
      var added = toArray(mutation.addedNodes).filter(function(n) {
        return n.nodeType == 1;
      });
      if(added.length) {
        chrome.extension.sendMessage({
          type: "update",
          data: new ElementData(added)
        });
      }
    }
  });
}).observe(document.documentElement, { subtree: true, childList: true });
