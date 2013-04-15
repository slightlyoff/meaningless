#!/usr/bin/env python

from google.appengine.ext import ndb
from google.appengine.api import memcache

import base64
import datetime
import jinja2
import json
import logging
import os
import uuid
import webapp2

import datamodel

EXTENSION_VERSION = "0.2"

templateEnv = jinja2.Environment(
  extensions = ['jinja2.ext.loopcontrols', 'jinja2.ext.with_'],
  loader = jinja2.FileSystemLoader(
    os.path.join(os.path.dirname(__file__), "templates")
  )
)
templateEnv.globals["version"] = os.environ["CURRENT_VERSION_ID"].split('.')[0]
templateEnv.globals["app"] = os.environ["APPLICATION_ID"]

class BaseHandler(webapp2.RequestHandler):
  def get(self):
    template = templateEnv.get_template("default.html")
    self.response.write(template.render({}))

class MainHandler(BaseHandler):
  pass

class ReportUploadHandler(webapp2.RequestHandler):

  def post(self):
    # FIXME: use self.request.get() to clamp to post() requests later.

    # FIXME: need better abuse controls rate limiting. A Memcache of recent seen
    # client IPs is probably a reasonable first step.
    if self.request.get("version", None) != EXTENSION_VERSION:
      return self.response.write(json.dumps({
        "status": "failure",
        "error": "Extension version mismatch."
      }));

    data = None
    reportId = uuid.uuid4().hex
    if "data" in self.request.params:
      # logging.info(self.request.params["data"])
      data = json.loads(self.request.params["data"],
                        object_hook=datamodel.fromJSON)
      # logging.info(data)
      data.reportId = reportId

    if data is None:
      return self.redirect("/global")

    # Only persist our report after sanity checks.
    if not data.isSane():
      # TODO: display some sort of failure message
      pass

    future = data.put_async()

    if self.request.get("showReport") == "false":
      # The extension uploaded it and doesn't want us to generate a view, so
      # send back a status code
      self.response.write(json.dumps({
        "status": "success",
        "error": None,
        "reportId": reportId,
        "reportURL": "/report/%s" % (base64.urlsafe_b64encode(reportId),)
      }));
    else:
      # reportId = base64.urlsafe_b64encode(id.bytes)
      # Log the data and redirect to a report.
      dest = "/report/%s" % (base64.urlsafe_b64encode(reportId),)
      self.redirect(dest)

    future.get_result()

  def get(self):
    return self.post()

class ReportViewHandler(BaseHandler):
  def get(self, id=''):
    try:
      id = base64.urlsafe_b64decode(id)
      query = datamodel.ReportData.query(datamodel.ReportData.reportId == id)
      data = query.fetch(1)[0]
      if self.request.get("type") == "json":
        self.response.headers['Content-Type'] = "application/json"
        self.response.write(json.dumps(data, default=datamodel.toJSON,
                                       sort_keys=True, indent=2))
      else:
        template = templateEnv.get_template("report.html")
        self.response.write(template.render({
          "title": "Your Upload",
          # NOTE: we assume that jinja2 HTML escapes all content for us, letting
          # us not worry about XSS from this
          "params": self.request.params,
          "id": id,
          "content": data
        }))
    except:
      template = templateEnv.get_template("report.html")
      self.response.write(template.render({ "error": "Report not found!" }))

class TrendsHandler(BaseHandler):
  pass

class GlobalStatsHandler(BaseHandler):

  @ndb.tasklet
  def globalMetrics(self):
    metrics = datamodel.TimeSliceMetrics.empty()
    metrics.date = datetime.date.today()
    qry = datamodel.ReportData.query().order(datamodel.ReportData.date)
    qit = qry.iter()
    while (yield qit.has_next_async()):
      next = qit.next()
      if next and not metrics.start:
        metrics.start = next.date
      # logging.info(next.delta)
      # metrics.totals += next.totals
      metrics.totals += next.delta
      metrics.end = next.date
      # metrics += next

    raise ndb.Return(metrics)

  def get(self):
    # Until we get this cron'd, query the entire datas set, generate
    # TimeSliceMetrics from it, and format them for display.
    today = datetime.date.today().isoformat()
    # logging.info(today)
    metrics = memcache.get('%s:global_stats' % today)
    # logging.info(metrics.created)
    if metrics is None:
      metrics = self.globalMetrics().get_result()
      # Cache for 2 hours
      memcache.set('%s:global_stats' % today, metrics, 60 * 60 * 2)

    # logging.info(metrics)
    jsonMetricsString = json.dumps(metrics, default=datamodel.toJSON,
                                   sort_keys=True, indent=2)

    if self.request.get("type") == "json":
      self.response.headers['Content-Type'] = "application/json"
      self.response.write(jsonMetricsString)
    else:
      template = templateEnv.get_template("report.html")
      self.response.write(template.render({
        "title": "Meaningless Global Stats",
        "content": datamodel.toJSON(metrics),
        "json": jsonMetricsString
      }))


class PrivacyHandler(BaseHandler):
  def get(self):
    template = templateEnv.get_template("privacy.html")
    self.response.write(template.render({}))

class AboutHandler(BaseHandler):
  def get(self):
    template = templateEnv.get_template("about.html")
    self.response.write(template.render({}))

class TaskHandler(BaseHandler):
  def get(self, name="daily"):
    pass

app = webapp2.WSGIApplication([
  ("/", MainHandler),
  ("/report", ReportUploadHandler),
  (r"/report/(.+)", ReportViewHandler),
  ("/trends", TrendsHandler),
  ("/global", GlobalStatsHandler),
  ("/global/", GlobalStatsHandler),
  ("/privacy", PrivacyHandler),
  ("/about", AboutHandler),
  ("/task/(.+)", TaskHandler),
], debug=True)
