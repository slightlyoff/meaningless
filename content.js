var getStats = function(elements) {
  return new PageDataGroup(elements);
};

var report = function(data) {
  // Send the data to our background page:
  chrome.extension.sendMessage(
    data,
    function(response) { console.log(response); }
  );
}

report(
  getStats(
    elements()));
