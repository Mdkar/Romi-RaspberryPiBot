// Copyright Pololu Corporation.  For more information, see https://www.pololu.com/
stop_motors = true
block_set_motors = false
mouse_dragging = false

var SpeechRecognition = window.SpeechRecognition || webkitSpeechRecognition;
var SpeechGrammarList = window.SpeechGrammarList || webkitSpeechGrammarList;
var SpeechRecognitionEvent = window.SpeechRecognitionEvent || webkitSpeechRecognitionEvent;
var commands = ['spin' , 'photo'];
var grammar = '#JSGF V1.0; grammar commands; public <command> = '
+ commands.join(' \| ') + ' ;';
var recognition = new SpeechRecognition();
var speechRecognitionList = new SpeechGrammarList();
speechRecognitionList.addFromString(grammar, 1);
recognition.grammars = speechRecognitionList;
recognition.continuous = false;
recognition.lang = 'en-US';
recognition.interimResults = false;
recognition.maxAlternatives = 1;
var diagnostic;

recognition.onresult = function(event) {
  var command = event.results[0][0].transcript;
  diagnostic.textContent = 'Result received: ' + command + '.';
  command = command.split(' ').filter(word => commands.includes(word))[0]
  console.log(command)
  switch (command) {
    case "spin":
      $.ajax({url: "leds/1,0,0"})
      break;
    case "photo":
      document.getElementById("photo").click()
      break;
    default:
      break;
  }
  console.log('Confidence: ' + event.results[0][0].confidence);
}
recognition.onspeechend = function() {
  recognition.stop();
}
recognition.onnomatch = function(event) {
  diagnostic.textContent = 'I didn\'t recognize that color.';
}
recognition.onerror = function(event) {
  diagnostic.textContent = 'Error occurred in recognition: ' + event.error;
}

function init() {
  diagnostic = document.querySelector('.output');
  poll()
  $("#joystick").bind("touchstart",touchmove)
  $("#joystick").bind("touchmove",touchmove)
  $("#joystick").bind("touchend",touchend)
  $("#joystick").bind("mousedown",mousedown)
  $(document).bind("mousemove",mousemove)
  $(document).bind("mouseup",mouseup)
}

function poll() {
  $.ajax({url: "status.json"}).done(update_status)
  if(stop_motors && !block_set_motors)
  {
    setMotors(0,0);
    stop_motors = false
  }
}

function update_status(json) {
  s = JSON.parse(json)
  $("#battery_millivolts").html(s["battery_millivolts"])
  setTimeout(poll, 100)
}

function touchmove(e) {
  e.preventDefault()
  touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
  dragTo(touch.pageX, touch.pageY)
}

function mousedown(e) {
  e.preventDefault()
  mouse_dragging = true
}

function mouseup(e) {
  if(mouse_dragging)
  {
    e.preventDefault()
    mouse_dragging = false
    stop_motors = true
  }
}

function mousemove(e) {
  if(mouse_dragging)
  {
    e.preventDefault()
    dragTo(e.pageX, e.pageY)
  }
}

function dragTo(x, y) {
  elm = $('#joystick').offset();
  x = x - elm.left;
  y = y - elm.top;
  w = $('#joystick').width()
  h = $('#joystick').height()

  x = (x-w/2.0)/(w/2.0)
  y = (y-h/2.0)/(h/2.0)

  if(x < -1) x = -1
  if(x > 1) x = 1
  if(y < -1) y = -1
  if(y > 1) y = 1

  left_motor = Math.round(300*(-y+x))
  right_motor = Math.round(300*(-y-x))

  if(left_motor > 300) left_motor = 300
  if(left_motor < -300) left_motor = -300

  if(right_motor > 300) right_motor = 300
  if(right_motor < -300) right_motor = -300

  stop_motors = false
  setMotors(left_motor, right_motor)
}

function touchend(e) {
  e.preventDefault()
  stop_motors = true
}

function setMotors(left, right) {
  $("#joystick").html("Motors: " + left + " "+ right)

  if(block_set_motors) return
  block_set_motors = true

  $.ajax({url: "motors/"+left+","+right}).done(setMotorsDone)
}

function setMotorsDone() {
  block_set_motors = false
}

function setLeds() {
  led0 = $('#led0')[0].checked ? 1 : 0
  led1 = $('#led1')[0].checked ? 1 : 0
  led2 = $('#led2')[0].checked ? 1 : 0
  $.ajax({url: "leds/"+led0+","+led1+","+led2})
}

function playNotes() {
  notes = $('#notes').val()
  $.ajax({url: "play_notes/"+notes})
}

function shutdown() {
  if (confirm("Really shut down the Raspberry Pi?"))
    return true
  return false
}
