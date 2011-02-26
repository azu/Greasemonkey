// ==UserScript==
// @name           Nico share play
// @namespace      http://efcl.info/
// @description    ニコニコ動画の動画をGIGA SCHEMAに登録してシャッフルプレイ
// @include        http://www.nicovideo.jp/watch/*
// ==/UserScript==
// http://gigaschema.appspot.com/help
(function() {
    var USER_NAME = "azuciao",
            SCHEME_NAME = "playshare";

    window.addEventListener('NicoSharePlay.load', function(ev) {
        // eventを受け取り
        // JSON.parse(ev.data)してobjectに変換
        // containerからdispatchしておくと,
        // ev.targetから対象のDOM Elementも送り付けられる
        recordData("value="+ev.data, finishSubmit);
    }, false);
    var submitBt = document.createElement("a");
    submitBt["textContent" || "innerText"] = "いいね!";
    submitBt.addEventListener("click", submitToSever, false);
    var insertHere = document.getElementById("outside");
    insertHere.appendChild(submitBt);
    function finishSubmit(result) {
        log(result);
    }

    function submitToSever() {
        // Contextで実行して、取得内容をlistenしたところに送る
        evalInPage(function(args) {
            var send_data,
                    Video = window.Video;
            send_data = {
                "vid" : Video.id,
                "vtitle" : Video.title,
                "vlength": Video.length,
                "vlockedTags" : Video.lockedTags,
                "vtags" : Video.tags
            }
            // Web ページ
            var request = document.createEvent("MessageEvent");
            request.initMessageEvent("NicoSharePlay.load", true, false,
                    JSON.stringify(send_data),
                    location.protocol + "//" + location.host,
                    "", window);
            document.dispatchEvent(request);// =>GMPingMessage
        }, []);
        function evalInPage(fnArg, args) {
            var argStr = JSON.stringify(args || []);
            location.href = "javascript:void " + fnArg + ".apply(null," + argStr + ")";

        }
    }

    /**
     * GIGA SCHEMAにデータを保存する
     * @param data パラメータと値を=でつないで、パラメータごとに&でつないだもの
     * パラメータ    値
     value    データとして記録する値(複数可)
     group    データを取得する際に絞り込みに利用可能な任意の文字列
     */
    function recordData(data, callback) {
        if (!data) return;
        var xhr = new XMLHttpRequest(),
                sendBody = data;
        xhr.open('POST', "http://gigaschema.appspot.com/" + USER_NAME + "/" + SCHEME_NAME + ".json", true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');// これないと500
        xhr.onload = function onload(evt) {
            callback(JSON.parse(xhr.responseText));
        }
        xhr.onerror = function onerror(evt) {
            GM_log(xhr.statusText + " : " + xhr.responseText);
        }
        xhr.send(sendBody);
    }
})();
function log(m) {
    var w = this.unsafeWindow || window;
    w.console && w.console.log.apply(this, arguments);
}