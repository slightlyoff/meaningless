#!/usr/bin/env python

import webapp2
import jinja2
import os

templateEnv = jinja2.Environment(
  loader = jinja2.FileSystemLoader(
    os.path.join(os.path.dirname(__file__), "templates")
  )
)
templateEnv.globals["version"] = os.environ["CURRENT_VERSION_ID"]
templateEnv.globals["app"] = os.environ["APPLICATION_ID"]

class MainHandler(webapp2.RequestHandler):
  def get(self):
    template = templateEnv.get_template("default.html")
    self.response.write(template.render({}))

app = webapp2.WSGIApplication([
  ("/", MainHandler)
], debug=True)
