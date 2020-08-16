from app import app
from flask import render_template, jsonify, request, Response, abort
import random
from datetime import datetime
import json
import time
from functools import wraps

line_labels = [4, 10, 12, 13, 15, 20, 25, 28, 33, 37, 40, 45]
line_values = [3, 2, .2, .5, 10, 9, 10, 10, 8, 8, 6, 2, .3]

colors = [
    "#F7464A", "#46BFBD", "#FDB45C", "#FEDCBA",
    "#ABCDEF", "#DDDDDD", "#ABCABC", "#4169E1",
    "#C71585", "#FF4500", "#FEDCBA", "#46BFBD"]

pressure_value = round(random.random() * 20, 2)
temp_value = 200.00
time_value = 5.2

def generate_random_data():
    now = datetime.now()
    while True:
        current_time_dif = round((datetime.now() - now).total_seconds(), 2)
        json_data = json.dumps(
            {'time': current_time_dif,
             'value': random.random() * 14}
        )
        yield f"data:{json_data}\n\n"
        time.sleep(1)

# Only starting with one page
@app.route("/") # home page
@app.route("/index")
def hello():
    return render_template('dashboard_no_sidebar.html', time_value=time_value, pressure_value=pressure_value, temp_value=temp_value)
    # return render_template(
    #     'dashboard.html',
    #     line_labels=line_labels,
    #     line_values=line_values,
    #     temp_value=temp_value,
    #     pressure_value=pressure_value,
    #     time_value=time_value)

@app.route("/chart-data")
def chart_data():
    return Response(generate_random_data(), mimetype="text/event-stream")