// Aggregate stats for this session and send a message to the content scripts to
// display the totals.

var debug = true;

var AggregatePageData = function() {
  PageData.call(this);
  this.pages = 0;
};
AggregatePageData.prototype = Object.create(PageData.prototype, {
  aggregate: {
    enumerable: false,
    writable: true,
    configruable: true,
    value: function(data, sender) {
      this.pages++;
      this.total += data.total;
      this.tags.merge(data.tags);
      this.schemaDotOrgItems.merge(data.schemaDotOrgItems);
      this.microformatItems.merge(data.microformatItems);
      this.ariaItems.merge(data.ariaItems);
      this.semantics.merge(data.semantics);
    }
  },
  summary: {
    enumerable: false,
    configruable: true,
    get: function() {
      return {
        total: this.total,
        pages: this.pages,
        tags: this.tags,
        schemaDotOrgItems: this.schemaDotOrgItems,
        microformatItems: this.microformatItems,
        ariaItems: this.ariaItems,
        semantics: this.semantics,
      };
    }
  }
});

var totals = new AggregatePageData();

chrome.extension.onMessage.addListener(
  function(data, sender, sendResponse) {
    if (debug) {
      console.log(sender.tab ?
                  "from a content script:" + sender.tab.url :
                  "from the extension");

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
    }

    totals.aggregate(data, sender);
    sendResponse(totals.summary);
});
