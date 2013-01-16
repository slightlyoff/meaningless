// Aggregate stats for this session and send a message to the content scripts to
// display the totals.

chrome.extension.onMessage.addListener(
  function(data, sender, sendResponse) {
    console.log(sender.tab ?
                "from a content script:" + sender.tab.url :
                "from the extension");

    console.log(data);
    // Log what we received.
    forIn(data, function(key, set) {
      console.log(key, set);
      var s = set.summary;
      console.log("Total", key, ":", set.total);
      if (set.total) {
        console.log("  Top", s.top.length, key);
        s.top.forEach(function(o) {
          console.log("    ", o.key, ":", o.value, "("+((o.value/set.total) * 100).toFixed(1)+"%)");
        });

        console.log("  Metadata");
        s.metaData.forEach(function(o) {
          console.log("    ", o.key, ":", o.value);
        });
      }
    });
});
