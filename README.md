# Meaningless

A Chrome Extension to uncover the semantics of the web.

## What It Does

The Meaningless extension looks at the elements and attributes that make up the
web pages you browse, even the dynamic content that's loaded after a page is
initially served, and figures out how "semantic" the resulting page is. That is
to say, if the web developer wanted to put a dialog in the web page (for which
there is no straightforward HTML element), what lengths did they go to to convey
to you, to search engines, and to assistive technology that the UI you're
viewing isn't just a collection of boxes, but is instead a "dialog"?

## How It Works

Every [HTML element](https://developer.mozilla.org/en-US/docs/HTML/Element) has
some meaning, even if it's to denote that a block of content doesn't have a
well-understood pre-defined meaning
(e.g. [`div`](https://developer.mozilla.org/en-US/docs/HTML/Element/div) and
[`span`](https://developer.mozilla.org/en-US/docs/HTML/Element/span)).

As the web has evolved, side-contracts have become a common way for developers,
search engines, and assistive technologies (like
[screen readers](http://www.nvda-project.org/)) to produce and consume
information about types of content for which HTML doesn't yet include nouns. The
most prominent of these are [WAI-ARIA](http://www.w3.org/TR/wai-aria-primer/),
[Microformats](http://microformats.org/about), and
[Schema.org](http://schema.org/).

Many other sorts of side-contracts exist along side these, notably "progressive
enhancement" through JavaScript frameworks like [Dojo](http://dojotoolkit.org),
[Sencha](http://www.sencha.com/), and [JQuery UI](http://jqueryui.com/).
Meaningless doesn't detect these frameworks directly, instead relying on their
support for ARIA to detect their overall meaning. The theory here is that any
framework worth it's salt must be accessible, and if it's not...well is that
content really semantic? We think not.

## What The Service Collects

About once a day, Meaningless checks in with a reporting service to provide
anonymous, aggregate statistics about the total number of elements seen, their
classificiations, and raw detailed breakdowns of the most common types of
semantics. None of this is traceable to an individual, and no personally
identifiable information is collected or logged. Uninstalling the extension and
re-installing it will beging reporting with a new random identifier, and no
persistent information is authenticated. Further, no information beyond the
broad types of semantics of the markup on pages is reported about the sites you
visit. No URLs are logged and no session information can leak.

## Will Meaningless Slow Down My Web Browsing?

No.

The extension has been carefully designed not to impact page loading or
meaningfully affect overall browsing performance. It uses several techniques to ensure great performance, even for the tab-collecting among us:

  * Meaningless is injected into pages only when the browser isn't doing
    anything more important, and thanks to [Mutation
    Observers](https://developer.mozilla.org/en-US/docs/DOM/MutationObserver) it
    can follow along as pages change over time without impacting the performance
    of other scripts on the page.
  * The extension is designed to do minimum work. No bloated libraries, no
    overly-expensive algorithms, the code is tuned to only do the minimum needed
    to charachterize the semantic content of a page.
  * Uploading of stats to the Meaningless reporting service is off-loaded to a
    background task which keeps your pages responsive.
  * Using the [Page Visibility API](http://www.w3.org/TR/page-visibility/),
    Meaningless ensures that no extra work is done on pages that would otherwise
    be "put to sleep" by the browser.

As with any code that is run on each page, there *is* some cost, but thanks to
defensive coding, Meaningless shouldn't ever slow down your browsing. If you
have concerns about the extension or reporting service, please file an issue
here.