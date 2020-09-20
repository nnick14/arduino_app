from app import app
from flask import render_template, jsonify, request, Response, abort
import random
from datetime import datetime
import json
import time
from functools import wraps

# Only starting with one page
@app.route("/") # home page
@app.route("/index")
def main_page():
    return render_template('dashboard_no_sidebar.html') #, time_value=time_value, pressure_value=pressure_value, temp_value=temp_value)

@app.route("/pour_feed")
def pour_feed():
    return render_template('pour_feed.html')