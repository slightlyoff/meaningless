#!/usr/bin/env python

import webapp2
import logging
import jinja2
import json
import os
from google.appengine.ext import db

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
    template = templateEnv.get_template("report.html")
    self.response.write(template.render({
      # NOTE: we assume that jinja2 HTML escapes all content for us, letting us
      # not worry about XSS from this
      "params": self.request.params,
      "content": json.loads(self.request.params["content"])
    }))

  def get(self):
    return self.post()

class ReportViewHandler(BaseHandler):
  pass

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

app = webapp2.WSGIApplication([
  ("/", MainHandler),
  ("/report", ReportUploadHandler),
  (r"/report/(\d+)", ReportViewHandler),
  ("/trends", TrendsHandler),
  ("/global", GlobalStatsHandler),
  ("/extension", ExtensionHandler),
  ("/privacy", PrivacyHandler),
  ("/about", AboutHandler),
], debug=True)
