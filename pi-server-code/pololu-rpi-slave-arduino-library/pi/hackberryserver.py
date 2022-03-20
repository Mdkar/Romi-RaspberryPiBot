#!/usr/bin/env python3

# Copyright Pololu Corporation.  For more information, see https://www.pololu.com/
from flask import Flask
from flask import render_template
from flask import redirect
from flask import Response
from flask import send_file
from subprocess import call
from picamera import PiCamera

from camera_pi import Camera
# import logging
# import socketserver
from threading import Condition
# from http import server

app = Flask(__name__)
app.debug = True

from a_star import AStar
a_star = AStar()

import json

led0_state = False
led1_state = False
led2_state = False

snapshot_requested = True

# output
# camera = Camera()

def gen(camera):
    global snapshot_requested
    """Video streaming generator function."""
    yield b'--frame\r\n'
    while True:
        frame = camera.get_frame()
        if snapshot_requested:
            f = open('/home/pi/pololu-rpi-slave-arduino-library/pi/image.jpg', 'wb')
            f.write(frame)
            f.close()
            # send_file(frame, mimetype='image/jpeg')
            snapshot_requested = False
        yield b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n--frame\r\n'


@app.route('/video_feed')
def video_feed():
    """Video streaming route. Put this in the src attribute of an img tag."""
    return Response(gen(Camera()),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/photo')
def snapshot():
    global snapshot_requested
    snapshot_requested = True
    while(snapshot_requested):
        pass
    return send_file('image.jpg', mimetype='image/jpeg')

@app.route("/")
def hello():
    return render_template("home.html")

# @app.route("/stream.mjpg")
# def streamjpg():
#     return output.frame

@app.route("/status.json")
def status():
    buttons = a_star.read_buttons()
    analog = a_star.read_analog()
    battery_millivolts = a_star.read_battery_millivolts()
    encoders = a_star.read_encoders()
    data = {
        "buttons": buttons,
        "battery_millivolts": battery_millivolts,
        "analog": analog,
        "encoders": encoders
    }
    return json.dumps(data)

@app.route("/motors/<left>,<right>")
def motors(left, right):
    a_star.motors(int(left), int(right))
    return ""

@app.route("/leds/<int:led0>,<int:led1>,<int:led2>")
def leds(led0, led1, led2):
    a_star.leds(led0, led1, led2)
    global led0_state
    global led1_state
    global led2_state
    led0_state = led0
    led1_state = led1
    led2_state = led2
    return ""

@app.route("/heartbeat/<int:state>")
def hearbeat(state):
    if state == 0:
      a_star.leds(led0_state, led1_state, led2_state)
    else:
        a_star.leds(not led0_state, not led1_state, not led2_state)
    return ""

@app.route("/play_notes/<notes>")
def play_notes(notes):
    a_star.play_notes(notes)
    return ""

@app.route("/halt")
def halt():
    call(["bash", "-c", "(sleep 2; sudo halt)&"])
    return redirect("/shutting-down")

@app.route("/shutting-down")
def shutting_down():
    return "Shutting down in 2 seconds! You can remove power when the green LED stops flashing."

if __name__ == "__main__":
    app.run(host = "0.0.0.0")
