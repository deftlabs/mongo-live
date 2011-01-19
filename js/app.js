
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
 * Start the app.
 */
function runApp() {
    startServerStatusPoll('localhost', 28017);

    createChart('opcounters', 'query', 'opcountersQueryChart', 'rgba(57, 20, 175, 1)', 'rgba(57, 20, 175, 0)', true);
    createChart('opcounters', 'insert', 'opcountersInsertChart', 'rgba(135, 110, 215, 1)', 'rgba(135, 110, 215, 0)', true);
    createChart('opcounters', 'update', 'opcountersUpdateChart', 'rgba 64, 171, 1)', 'rgba(18, 64, 171, 0)', true);
    createChart('opcounters', 'delete', 'opcountersDeleteChart', 'rgba(255, 231, 115, 1)', 'rgba(255, 231, 115, 0)', true);
    createChart('opcounters', 'command', 'opcountersCommandChart', 'rgba(255, 128, 64, 1)', 'rgba(255, 128, 64, 0)', true);
    createChart('opcounters', 'getmore', 'opcountersGetmoreChart', 'rgba(191, 96, 48, 1)', 'rgba(191, 96, 48, 0)', true);
    createChart('connections', 'current', 'connectionsCurrentChart', 'rgba(255, 255, 0, 1)', 'rgba(255, 255, 0, 0)', false);
    createChart('extra_info', 'page_faults', 'pageFaultsChart', 'rgba(185, 247, 62, 1)', 'rgba(185, 247, 62, 0)', true);
    createChart('backgroundFlushing', 'flushes', 'flushesChart', 'rgba(166, 137, 0, 1)', 'rgba(166, 137, 0, 0)', true);
    createPercentChart('lockedPercentChart', 'rgba(191, 191, 48, 1)', 'rgba(191, 191, 48, 0)', 'globalLock', 'totalTime', 'globalLock', 'lockTime');
    createPercentChart('idxMissPercentChart', 'rgba(166, 75, 0, 1)', 'rgba(166, 75, 0, 0)', 'indexCounters', 'btree.accesses', 'indexCounters', 'btree.misses');
    createChart('mem', 'mapped', 'memMappedChart', 'rgba(255, 116, 0, 1)', 'rgba(255, 116, 0, 0)', false);
    createChart('network', 'bytesIn', 'netInChart', 'rgba(255, 128, 64, 1)', 'rgba(255, 128, 64, 0)', true);
    createChart('network', 'bytesOut', 'netOutChart', 'rgba(191, 96, 48, 1)', 'rgba(191, 96, 48, 0)', true);

};

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
 * Add a server status value to a series for a group/identity.
 */
function addServerStatusValueToSeries(series, group, identity, isCounter) {
    var x = (new Date()).getTime();

    var currentValue = extractServerStatusValue(currentServerStatus, group, identity);
    
    var y = 0;
    if (isCounter) {
        var previousValue = extractServerStatusValue(previousServerStatus, group, identity);
   
        if (currentValue && previousValue && (currentValue > previousValue)) {
            y = currentValue - previousValue;
        }
    } else { y = currentValue; }
    series.append(x, y);
};

/**
 * Add a server status value to a series for a group/identity.
 */
function addPercentToTimeSeries(series, group1, identity1, group2, identity2) {
    var x = (new Date()).getTime();

    var current1 = extractServerStatusValue(currentServerStatus, group1, identity1);
    var current2 = extractServerStatusValue(currentServerStatus, group2, identity2);

    var previous1 = extractServerStatusValue(previousServerStatus, group1, identity1);
    var previous2 = extractServerStatusValue(previousServerStatus, group2, identity2);
    
    var y = 0;

    var x1 = previous2 - current2;
    var y1 = previous1 - current1;

    if (y1 != 0) { y = (((x1 / y1) * 1000) / 10); }

    series.append(x, y);
};

/**
 * Create the lock percentage chart.
 */
function createPercentChart(divId, lineColor, fillColor, group1, identity1, group2, identity2) {
    var series = new TimeSeries();
    setInterval(function() { addPercentToTimeSeries(series, group1, identity1, group2, identity2); }, 1000);

    var chart = new SmoothieChart({ millisPerPixel: 20, grid: { strokeStyle: '#555555', fillStyle: '#402817',  lineWidth: 1, millisPerLine: 1000, verticalSections: 4 }});
    chart.addTimeSeries(series, { strokeStyle: lineColor, fillStyle: fillColor, lineWidth: 3 });
    chart.streamTo(document.getElementById(divId), 1000);
};

/**
 * Create a chart with a single time series.
 */
function createChart(group, identity, divId, lineColor, fillColor, isCounter) {
    var series = new TimeSeries();

    setInterval(function() { addServerStatusValueToSeries(series, group, identity, isCounter); }, 1000);

    var chart = new SmoothieChart({ millisPerPixel: 20, grid: { strokeStyle: '#555555', fillStyle: '#402817',  lineWidth: 1, millisPerLine: 1000, verticalSections: 4 }});
    chart.addTimeSeries(series, { strokeStyle: lineColor, fillStyle: fillColor, lineWidth: 3 });
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
            
            var resp = JSON.parse(fixDateFields(xhr.responseText));
            
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

/**
 * There is a date format bug in some older versions of Mongo. Thanks to Lucas for 
 * submitting part of the regex solution :-)
 *
 * The regex below replaces the date fields with 0 (since they are not used).
 *
 * http://jira.mongodb.org/browse/SERVER-2378
 * 
 * The old format is:
 * "last_finished" : Date( 1295450058854 ) 
 * The date format in newer releases is:
 * "localTime" : { "$date" : 1295452287356 }
 */
function fixDateFields(resp) { return resp.replace(/Date\( (\d+) \)/g, "0"); };

function isInt(v) {
    var regex = /(^-?\d\d*$)/;
    return regex.test(v);
};

function getPersistedItem(key) {
    var value;
    try { value = window.localStorage.getItem(key);
    } catch(e) { value = null; }
    if (value) return JSON.parse(value);
    return null;
};

function persistItem(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
};
