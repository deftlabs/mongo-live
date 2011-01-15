
/*
Copyright 2011, Deft Labs.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at:

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

var currentServerStatus = [];
var previousServerStatus = [];

/**
 * Start the interval lookup for server status.
 */
function startServerStatusPoll(mongoHost, mongoPort) {
    setInterval(function() {
        queryServerStatus(mongoHost, mongoPort, function(response) { 
            previousServerStatus = currentServerStatus;
            currentServerStatus = response;
        });
    }, 1000);
};

/**
 * Returns the value or undefined if not found.
 */
function extractServerStatusValue(serverStatus, group, identity) {
    var groupObj = serverStatus[group];

    if (!groupObj) return undefined;
    if (identity.indexOf('.') == -1) return groupObj[identity];

    // We are dealing with a nested object. 
    var nestedGroupName = identity.substring(0, identity.indexOf('.'));
    var nestedIdentityName = identity.substring(identity.indexOf('.')+1, identity.length);

    var nestedGroupObj = groupObj[nestedGroupName];
    if (!nestedGroupObj) return undefined;

    return nestedGroupObj[nestedIdentityName];
};

/**
 * Add a server statu value to a series for a group/identity.
 */
function addServerStatusValueToSeries(series, group, identity) {
    var x = (new Date()).getTime();

    var currentValue = extractServerStatusValue(currentServerStatus, group, identity);
    var previousValue = extractServerStatusValue(previousServerStatus, group, identity);

    var y = 0;
    if (currentValue && previousValue && (currentValue > previousValue)) {
        y = currentValue - previousValue;
    }

    series.append(x, y);
};

/**
 * Create a chart.
 */
function createChart(chartName, group, identity, divId) {
    var series = new TimeSeries();

    setInterval(function() { addServerStatusValueToSeries(series, group, identity); }, 1000);

    var chart = new SmoothieChart({ millisPerPixel: 20, grid: { strokeStyle: '#555555', fillStyle: '#402817',  lineWidth: 1, millisPerLine: 1000, verticalSections: 4 }});
    chart.addTimeSeries(series, { strokeStyle: 'rgba(102, 204, 102, 1)', fillStyle: 'rgba(102, 204, 102, 0.2)', lineWidth: 3 });
    chart.streamTo(document.getElementById(divId), 1000);
};

function queryServerStatus(mongoHost, mongoPort, success, failure, cmdError, notFound, serverError) {
    queryDb(('http://' + mongoHost + ':' + mongoPort + '/serverStatus'), success, failure, cmdError, notFound, serverError);
};

function queryDb(commandUrl, success, failure, cmdError, notFound, serverError) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", commandUrl, true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            var resp = JSON.parse(xhr.responseText);
            // TODO: Check for mongo error state in response json
            success(resp);
        } else if (xhr.readyState == 4 && xhr.status == 404) {
            notFound();
        } else if (xhr.readyState == 4 && xhr.status != 200) {
            if (serverError) serverError(xhr.readyState, xhr.status);
        } else {
            if (failure) failure(xhr.readyState, xhr.status);
        }
    }
    xhr.send();
};
