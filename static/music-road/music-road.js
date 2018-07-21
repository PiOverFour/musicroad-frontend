// Music Road
//
// Copyright (c) 2017-2018 Damien Picard dam.pic AT free.fr
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
// the Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
// FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
// COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
// IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
// CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// Fix modulo
// https://stackoverflow.com/questions/4467539/javascript-modulo-not-behaving
Number.prototype.mod = function(n) {
    return ((this%n)+n)%n;
};

var map = L.map('map').setView([43.6108, 3.8777], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Parse url
var hashValues, waypoints=[];
if (window.location.hash.includes('wp')) {

  hashValues = window.location.hash.split("&");
  // console.log(hashValues);
  for (var i=0; i <hashValues.length; i++) {
    // console.log(hashValues[i]);
    if (hashValues[i].includes('wp')) {
      waypoints.push(L.latLng((hashValues[i].split('=')[1].split(','))));
    }
  }
}
else {
  waypoints = [
    L.latLng(43.60509, 3.87224),
    L.latLng(43.60465, 3.87018)
  ];
}
// console.log(waypoints);

var control = L.Routing.control({
    waypoints: waypoints,
    routeWhileDragging: true,
    router: L.Routing.osrmv1({
      serviceUrl: "/route",
      profile: "driving",
    }),
    waypointMode: 'snap',
    collapsible: true,
});

// Music stuff
var synth = new Tone.DuoSynth({
  "harmonicity": 2,
  "vibratoAmount": 0.2,
  "vibratoRate": 3,
  // "portamento": 0.05,
  "voice0": {
    "oscillator":{
      "volume": -5,
      "type": "sine",
      // "mute": true
    },
    "envelope" : {
      "release": 1.0,
    },
  },
  "voice1": {
    "oscillator":{
      "volume": -3,
      "type": "triangle",
      // "mute": true
    },
    "filter": {
      "Q": 2,
      "type": "lowpass",
      "rolloff": -12,
    },
    "filterEnvelope": {
      "attack": 0.1,
      "decay": 0.2,
      "sustain": 0.2,
      "release": 1.0,
      "baseFrequency": 50,
    },
    "envelope" : {
      "attack" : 0.001,
      "decay": 0.4,
      "sustain": 0.1,
      "release": 1.0,
      // "attackCurve": "linear",
    },
  }
}).toMaster()

var NOTE_NAMES = ['C', 'C#',  'D',  'D#',  'E',  'F',  'F#',  'G',  'G#',  'A',  'A#',  'B'];

// var MIDI_NOTES = {}
// for (var i=0; i<128; i++) {
//   MIDI_NOTES[i] = NOTE_NAMES[i.mod(12)] + (Math.trunc(i/12)-2);
// }

var SCALES = {'major':  [0, 2, 4, 5, 7, 9, 11],
              'minor':  [0, 2, 3, 5, 7, 8, 10],
              'chromatic': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
              'hungarian': [0, 2,  3, 6, 7, 8, 11],
              'phrygian':  [0, 1, 4, 5, 7, 8, 10],};

var part, movingMarker;

var _result;

// Marker icon
var routeIcon = L.icon({
  iconUrl: 'static/leaflet/images/route-icon.png',
  shadowUrl: 'static/leaflet/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
  shadowAnchor: [13, 41]

});

// Get incoming routes
control.on("routesfound", function(result) {

  _result = result;
  console.clear()
  console.log("TROUVÉ !" + result);

  // Set url hash
  var hash = '#';
  for (var wp=0; wp < result.waypoints.length; wp++) {
    hash +=
      "wp="
      + result.waypoints[wp].latLng.lat
      + ","
      + result.waypoints[wp].latLng.lng
      + "&";
  }
  hash = hash.slice(0, -1); // remove trailing &
  window.location.hash = hash;

  // Stop previous score
  if (part) {part.stop()};
  if (movingMarker) {map.removeLayer(movingMarker)};


  var note, duration=0, startTime=0, modifier, distance, notes=[];
  var route = result.routes[0];

  // Initialize note from direction
  switch (route.instructions[0].direction) {
    case "S":
      note = -4;
      break;
    case "SW":
    note = -3;
    break;
    case "W":
      note = -2;
      break;
    case "NW":
      note = -1;
      break;
    case "N":
      note = 0;
      break;
    case "NE":
      note = 1;
      break;
    case "E":
      note = 2;
      break;
    case "SE":
      note = 3;
      break;
  }

  var markerDurations = [], previousInstructionIndex = 0;
  var markerLatlngs = [];

  // Build score from instructions
  for (var i=0; i < route.instructions.length-1; i++) {
    console.log('====');
    if (route.instructions[i].type == "WaypointReached") {
      continue;
    }
    modifier = route.instructions[i].modifier;
    distance = route.instructions[i].distance;
    // console.log(modifier + " " + distance);
    switch (modifier) {
      case "SharpLeft":
        note -= 3;
        break;
      case "Left":
        note -= 2;
        break;
      case "SlightLeft":
        note -= 1;
        break;

      case "Straight":
        break;

      case "SharpRight":
        note += 3;
        break;
      case "Right":
        note += 2;
        break;
      case "SlightRight":
        note += 1;
        break;

      default:
        break;
    }
    console.log('distance: ' + distance);
    duration = (distance/100)**(1/2);
    console.log('duration: ' + duration);
    console.log('note: ' + note);

    // Calculate from scale
    var scale = SCALES.major;
    var finalNote = scale[note.mod(scale.length)];
    var octave = Math.floor(note/scale.length);
    finalNote = NOTE_NAMES[finalNote] + (octave+3);
    console.log(finalNote);

    // Build marker animation durations
      var instructionMarkerDurations = [];
      for (var n= route.instructions[i].index; n < route.instructions[i+1].index-1; n++) {
        instructionMarkerDurations.push(
          Tone.TimeBase(duration).valueOf()*500 // ms
          / (route.instructions[i+1].index - route.instructions[i].index)
        );
    }

    notes.push({time : '4n * ' + startTime,
                note : finalNote,
                dur : '4n * ' + duration,
                markerLatlngs: route.coordinates.slice(route.instructions[i].index, route.instructions[i+1].index),
                markerDurations: instructionMarkerDurations,
                doKillMarker: i == route.instructions.length-2});
    startTime += duration;
    // console.log("NOTE:" + note + " " + _NOTES[note]);

    console.log('MARKER DURS: ' + instructionMarkerDurations.length);
    console.log(instructionMarkerDurations);
    console.log('MARKER LLGS: ' +  route.coordinates.slice(route.instructions[i].index, route.instructions[i+1].index).length);
    console.log( route.coordinates.slice(route.instructions[i].index, route.instructions[i+1].index));
  }
  // console.log('INSTRS DURS: ' + route.coordinates.length + ' ' + route.coordinates);

  part = new Tone.Part(function(startTime, event){
    //the events will be given to the callback with the time they occur
    synth.triggerAttackRelease(event.note, event.dur, startTime, velocity=2.0);
    Tone.Draw.schedule(function() {
      // this callback is invoked from a requestAnimationFrame
      // and will be invoked close to AudioContext time
      movingMarker.stop();
      movingMarker.initialize(event.markerLatlngs, event.markerDurations);
      if (event.doKillMarker) {
        movingMarker.on('end', function() {
          map.removeLayer(this);
        })
      }
      movingMarker.start();
    }, startTime) //use AudioContext time of the event
  }, notes)

  part.start()

  // start/stop the transport
  Tone.Transport.start('+0.1');

  // Marker

  // Create marker
  movingMarker = L.Marker.movingMarker(route.coordinates,
  markerDurations, {icon: routeIcon}).addTo(map);


  // animatedMarker = L.animatedMarker(route.coordinates, {
  //   distance: route.summary.totalDistance/100,
  //   // interval: 1000,
  //   autoStart: false,
  //   onEnd: function () {
  //     map.removeLayer(this);
  //   }
  // });
  // map.addLayer(animatedMarker);
});
control.addTo(map)
