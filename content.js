"use strict";

var display = function(local, global) {
  console.log("local stats:");
  console.dir(local);
  console.log("global stats:");
  console.dir(global);
};

var send = function(elementData) {
  // Send the data to our background page:
  chrome.extension.sendMessage(
    elementData,
    function(globalData) {
      display(elementData, globalData);
    }
  );
};

send(new ElementData(elements()));

// Now register a mutation observer to capture future additions to the DOM
// create an observer instance
new WebKitMutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    var added = toArray(mutation.addedNodes);
    if(added.length) {
      send(new ElementData(added));
    }
  });
}).observe(document.documentElement, { subtree: true, childList: true });
