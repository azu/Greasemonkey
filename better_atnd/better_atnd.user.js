// ==UserScript==
// @name           Better ATND
// @namespace      http://efcl.info/
// @description    ATNDをより便利にする
// @include        http://atnd.org/events/*
// ==/UserScript==
var DEBUG = true;
function log(m) {
    var w = this.unsafeWindow || window;
    w.console && w.console.log.apply(this, arguments);
}
var atnd = this.atnd || {};
(function() {
    var eventID = window.location.pathname.split("/").pop();

    function getEventJSON(eventID, callback) {
        var endpoint = "http://api.atnd.org/events/?event_id=" + eventID + "&format=json";
        GM_xmlhttpRequest({
            method:"GET",
            url: endpoint,
            onload:function(res) {
                var json = JSON.parse(res.responseText);
                DEBUG && log(res.statusText, json);
                callback(json);
            },
            onerror:function(res) {
                log(res.statusText + " : " + res.responseText);
            }
        });
    }

    function getGeoinfo(json) {
        // 緯度経度情報の取得
        var event = json.events[0];
        var lon = event.lon,
                lat = event.lat
        DEBUG && log('lon' + lon, 'lat' + lat);
        if ((lon && lat)
                && (parseFloat(lon) != 0.0 && parseFloat(lat) != 0.0)) {
            // 緯度経度情報が取得できた場合は最寄り駅を取得する
            DEBUG && log('GET GEOINFO');
            return {
                'lon' :lon,
                'lat' :lat
            };
        }
    }

    function getNearsideStation(geo, callback) {

        // 緯度経度から最寄り駅情報を取得
        var endpoint = "http://map.simpleapi.net/stationapi?x=" + String(geo.lon) + "&y=" + String(geo.lat) + "&output=json";
        var count = 0;
        GM_xmlhttpRequest({
            method:"GET",
            url:endpoint,
            onload:function(res) {
                var json = JSON.parse(res.responseText),
                        resultHTML = document.createDocumentFragment();
                var dl = document.createElement('dl');
                dl.setAttribute('class', "clearfix station-info");
                DEBUG && log("near Stations JSON", json);
                for (var i = 0,len = json.length; i < len; i++) {
                    var name = json[i].name;
                    var line = json[i].line;
                    var distance = json[i].distanceKm || json[i].distanceM;
                    var traveltime = json[i].traveltime;
                    var stationInfo = line + "/" + name + "/" + distance + "/" + traveltime;

                    var dt = document.createElement('dt');
                    dt.innerHTML = "最寄り駅 / ST:";
                    var dd = document.createElement('dd');
                    dd.appendChild(document.createTextNode(stationInfo));
                    dl.appendChild(dt);
                    dl.appendChild(dd);
                }
                resultHTML.appendChild(dl);
                DEBUG && log("resultHTML", resultHTML);
                callback(resultHTML);
            }
        });

    }

    function getStationHTML(callback) {
        getEventJSON(eventID, function(res) {
            var geoObj = getGeoinfo(res);
            getNearsideStation(geoObj, function(resHTML) {
                DEBUG && log("getStationHTML", resHTML);
                callback(resHTML);
            });
        });
    }

    atnd.st = {
        'eventID' : eventID,
        'getEventJSON' : getEventJSON,
        'getNearsideStation' :getNearsideStation,
        'getStationHTML' : getStationHTML
    };
})();

var insertArea = document.querySelector('#events-show > div.main > div.events-show-info');
atnd.st.getStationHTML(function(stationHTML) {
    insertArea.appendChild(stationHTML);
});
