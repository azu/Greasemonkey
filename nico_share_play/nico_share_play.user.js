// ==UserScript==
// @name           Nico share play
// @namespace      http://efcl.info/
// @description    ニコニコ動画の動画をGIGA SCHEMAに登録してシャッフルプレイ
// @include        http://www.nicovideo.jp/watch/*
// ==/UserScript==
// http://gigaschema.appspot.com/help
(function() {
    // http://gigaschema.appspot.com/azuciao/playshare
    var USER_NAME = "azuciao",
            SCHEME_NAME = "playshare";
    var isPlaying = GM_getValue("shareplay") || false;
    if (isPlaying) {
        playMovie();
    } else {
        var insertHere = document.getElementById("outside");
        insertHere.appendChild(submitBt);
        var submitBt = document.createElement("a");
        submitBt["textContent" || "innerText"] = "いいね!";
        submitBt.addEventListener("click", function() {
            insertHere.removeChild(submitBt);// 自爆する
            submitToSever();
        }, false);

    }
    if (typeof GM_registerMenuCommand !== 'undefined') {
        GM_registerMenuCommand("Nico share play - トグル", function() {
            toggleSwitch();
            isPlaying ? playNext() : stopMovie();
        });
    }
    window.addEventListener('NicoSharePlay.record', function(ev) {
        // eventを受け取り
        // JSON.parse(ev.data)してobjectに変換
        // containerからdispatchしておくと,
        // ev.targetから対象のDOM Elementも送り付けられる
        recordData("value=" + ev.data, finishSubmit);
    }, false);
    window.addEventListener('NicoSharePlay.start', function(ev) {
        // eventを受け取り
        // JSON.parse(ev.data)してobjectに変換
        // containerからdispatchしておくと,
        // ev.targetから対象のDOM Elementも送り付けられる
        playMovie();
    }, false);
    window.addEventListener('NicoSharePlay.next', function(ev) {
        // eventを受け取り
        // JSON.parse(ev.data)してobjectに変換
        // containerからdispatchしておくと,
        // ev.targetから対象のDOM Elementも送り付けられる
        playNext();
    }, false);

    function finishSubmit(result) {
        // log(result);
    }

    function toggleSwitch() {
        isPlaying = isPlaying ? false : true;
        saveStatus();
    }

    function saveStatus() {
        GM_setValue("shareplay", isPlaying);
    }

    function stopMovie() {
        isPlaying = false;
        saveStatus();
    }

    function playMovie() {
        if (!isPlaying) return;
        // console.log("wrapper is " + isWrapper);
        evalInPage(function(mode) {
            var player = document.getElementById("flvplayer");
            var isWrapper = (player.src.indexOf('flvplayer_wrapper.swf') !== -1);
            var playNext = function() {
                // Web ページ
                var request = document.createEvent("MessageEvent");
                request.initMessageEvent("NicoSharePlay.next", true, false,
                        location.href,
                        location.protocol + "//" + location.host,
                        "", window);
                document.dispatchEvent(request);
            }
            var t = setInterval(function() {
                var status = player.ext_getStatus();
                var playhead = player.ext_getPlayheadTime();
                if (status == "connectionError" || document.title == "Error?") {
                    clearInterval(t);
                    player.style.display = "none";
                    //controller.reload(true);
                } else if (status == "end") {
                    clearInterval(t);
                    playNext();
                }
                if (mode == "mute") {
                    // console.log(status , playhead);
                    if ((status == "paused" || status == "stopped") && playhead < 1) {// playheadは必ず0とは限らない
                        if (isWrapper) {
                            player.ext_play(1);
                            player.ext_setCommentVisible();
                            setTimeout(function() {
                                player.ext_setVideoSize('normal');
                                player.SetVariable('nico.player._video._visible', 0);
                            }, 1000);
                        } else {
                            player.ext_play(1);
                            player.ext_setCommentVisible();
                        }
                    }
                }

            }, 3000);
        }, ["mute"]);
    }


    function playNext(vid) {
        if (!isPlaying) return;
        if (vid) {
            location.href = "http://www.nicovideo.jp/watch/" + valueData.vid;
        } else {
            getRandomData(function(data) {
                var valueData = JSON.parse(data.value);
                location.href = "http://www.nicovideo.jp/watch/" + valueData.vid;
            });
        }
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
            request.initMessageEvent("NicoSharePlay.record", true, false,
                    JSON.stringify(send_data),
                    location.protocol + "//" + location.host,
                    "", window);
            document.dispatchEvent(request);
        }, []);
    }

    function evalInPage(fnArg, args) {
        var argStr = JSON.stringify(args || []);
        location.href = "javascript:void " + fnArg + ".apply(null," + argStr + ")";

    }

    /**
     * randomなjsonデータを取得
     * @param callback
     */
    function getRandomData(callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', "http://gigaschema.appspot.com/" + USER_NAME + "/" + SCHEME_NAME + "/random.json", true);
        xhr.onload = function onload(evt) {
            callback(JSON.parse(xhr.responseText));
        }
        xhr.onerror = function onerror(evt) {
            GM_log(xhr.statusText + " : " + xhr.responseText);
        }
        xhr.send(null);
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