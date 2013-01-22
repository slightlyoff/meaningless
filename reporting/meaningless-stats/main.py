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
# logging.info(os.environ["CURRENT_VERSION_ID"])
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
    clientId = None
    id = uuid.uuid4()
    if "data" in self.request.params:
      data = json.loads(self.request.params["data"])

    if data is None:
      return self.redirect("/global")

    if "clientId" in data and data["clientId"] is not None:
      clientId = data["clientId"]
    else:
      clientId = uuid.uuid4().hex;

    if not "showReport" in data or data["showReport"] is True:
      reportId = base64.urlsafe_b64encode(id.bytes)
      # Log the data and redirect to a report.
      return self.redirect("/report/%s" % (reportId,))

      """
      template = templateEnv.get_template("report.html")
      self.response.write(template.render({
        # NOTE: we assume that jinja2 HTML escapes all content for us, letting us
        # not worry about XSS from this
        "params": self.request.params,
        "content": data
      }))
      """
    else:
      # The extension uploaded it and doesn't want us to generate a view, so
      # send back a status code
      self.response.write(json.dumps({
        "status": "success",
        "error": None,
        "clientId": clientId,
        "id": id.hex,
      }));

  def get(self):
    return self.post()

class ReportViewHandler(BaseHandler):
  def get(self, id=0):
    template = templateEnv.get_template("report.html")
    self.response.write(template.render({ "id": id }))

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
