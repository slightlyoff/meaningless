"use strict";

var display = function(local, global) {
  console.log("local stats:");
  console.dir(local);
  console.log("global stats:");
  console.dir(global);
};

var getStats = function(elements) {
  return new PageDataGroup(elements);
};

var report = function(pageData) {
  // Send the data to our background page:
  chrome.extension.sendMessage(
    pageData,
    function(globalData) {
      display(pageData, globalData);
    }
  );
};

report(
  getStats(
    elements()));
