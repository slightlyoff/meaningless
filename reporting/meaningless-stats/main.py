#!/usr/bin/env python

# from google.appengine.ext import db
# from google.appengine.ext import ndb

import jinja2
import json
import logging
import os
import uuid
import webapp2
import base64

import datamodel

templateEnv = jinja2.Environment(
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
    # FIXME: save, get a UID, and redirect to an actual reporting URL
    data = None
    reportId = uuid.uuid4().hex
    if "data" in self.request.params:
      data = json.loads(self.request.params["data"],
                        object_hook=datamodel.fromJSON)
      data.reportId = reportId

    if data is None:
      return self.redirect("/global")

    if "clientId" in self.request.params:
      data.clientId = self.request.params["clientId"]
    else:
      data.clientId = uuid.uuid4().hex;

    data.put()

    if self.request.params["showReport"] == 'false':
      # The extension uploaded it and doesn't want us to generate a view, so
      # send back a status code
      return self.response.write(json.dumps({
        "status": "success",
        "error": None,
        "clientId": data.clientId,
        "reportId": reportId,
      }));
    else:
      # reportId = base64.urlsafe_b64encode(id.bytes)
      # Log the data and redirect to a report.

      dest = "/report/%s" % (base64.urlsafe_b64encode(reportId),)
      return self.redirect(dest)

  def get(self):
    return self.post()

class ReportViewHandler(BaseHandler):
  def get(self, id=''):
    id = base64.urlsafe_b64decode(id)
    query = datamodel.ReportData.query(
                datamodel.ReportData.reportId == id)
    data = query.fetch(1)[0]
    # logging.info(data)
    template = templateEnv.get_template("report.html")
    self.response.write(template.render({
      # NOTE: we assume that jinja2 HTML escapes all content for us, letting us
      # not worry about XSS from this
      "params": self.request.params,
      "id": id,
      "content": data
    }))
    # self.response.write(template.render({ "id": id }))

class TrendsHandler(BaseHandler):
  pass

class GlobalStatsHandler(BaseHandler):
  pass

class ExtensionHandler(BaseHandler):
  def get(self):
    template = templateEnv.get_template("extension.html")
    self.response.write(template.render({}))

class PrivacyHandler(BaseHandler):
  pass

class AboutHandler(BaseHandler):
  pass

class TaskHandler(BaseHandler):
  def get(self, name="daily"):
    pass

app = webapp2.WSGIApplication([
  ("/", MainHandler),
  ("/report", ReportUploadHandler),
  (r"/report/(.+)", ReportViewHandler),
  ("/trends", TrendsHandler),
  ("/global", GlobalStatsHandler),
  ("/extension", ExtensionHandler),
  ("/privacy", PrivacyHandler),
  ("/about", AboutHandler),
  ("/task/(.+)", TaskHandler),
], debug=True)
