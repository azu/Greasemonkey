// wedata utility for Greasemonkey
// usage
/*
 var DATABASE_URL = 'http://wedata.net/databases/XXX/items.json';
 var database = new Wedata.Database(DATABASE_URL);
 database.get(function(items) {
 items.forEach(function(item) {
    // do something
 });
 });

 // clear cache
 GM_registerMenuCommand('XXX - clear cache', function() {
 database.clearCache();
 });
*/
var Wedata = {};
Wedata.Database = function(url) {
    this.items = [];
    this.expires = 24 * 60 * 60 * 1000; // 1 day
    this.url = url;
};

Wedata.Database.prototype.get = function(callback) {
    var self = this;
    var cacheInfo = Wedata.Cache.get(self.url);
    if (cacheInfo) {
        self.items = cacheInfo;
        callback(self.items);
    } else {
        GM_xmlhttpRequest({
            method : "GET",
            url : self.url,
            onload : function(res) {
                self.items = JSON.parse(res.responseText);
                callback(self.items);
                Wedata.Cache.set(self.url, self.items, self.expires);
            },
            onerror:function(res) {
                GM_log(res.status + ":" + res.message);
            }
        });
    }
};

Wedata.Database.prototype.clearCache = function() {
    Wedata.Cache.set(this.url, null, 0);
}

Wedata.Cache = {};

Wedata.Cache.set = function(key, value, expire) {
    var expire = new Date().getTime() + expire;
    GM_setValue(key, JSON.stringify({ value: value, expire: expire }));
};

Wedata.Cache.get = function(key) {
    var cached = JSON.parse(GM_getValue(key, null));
    if (cached && cached.expire > new Date().getTime()) {
        return cached.value;
    }
};
