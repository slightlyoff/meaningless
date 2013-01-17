"use strict";

var display = function(local, global) {
  console.log("local stats:");
  console.dir(local);
  console.log("global stats:");
  console.dir(global);
};

var getStats = function(elements) {
  return new PageData(elements);
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

// Wait a bit for ads and Ajax stuff to come in.
var howLong = 0;
setTimeout(function() {
  report(
    getStats(
      elements()));
}, howLong);
