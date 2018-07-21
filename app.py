# Music Road
#
# Copyright (c) 2017-2018 Damien Picard dam.pic AT free.fr
#
# Permission is hereby granted, free of charge, to any person obtaining a copy of
# this software and associated documentation files (the "Software"), to deal in
# the Software without restriction, including without limitation the rights to
# use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
# the Software, and to permit persons to whom the Software is furnished to do so,
# subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
# FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
# COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
# IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
# CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

from flask import Flask, render_template, request
import requests
from pprint import pprint
import json

app = Flask(__name__)

OSRM_PORT = 5000

@app.route('/')
def index():
    html = 'index.html'
    try:
        # other_site = "truc"
        other_site = requests.get('http://localhost:5000').content.decode()
        return render_template(html, title="Music road")
    except:
        return 'The routing server is down.'

@app.route('/route/<path:options>', methods=['GET'])
def route(options):
    print('query_string:', request.query_string.decode())
    # print("OPTIONS:", options)
    try:
        route_request = requests.get('http://localhost:{}'.format(OSRM_PORT)
                     + '/route/v1/'
                     + options
                     + "?"
                     + request.query_string.decode()
                     ).content.decode()
    except:
        route_request = 'The routing server is down.'

    # Response from OSRM server
    print("\n" + "="*37 + " ROUTE " +"="*37 )
    pprint( json.loads(route_request))

    return route_request


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=1234)
