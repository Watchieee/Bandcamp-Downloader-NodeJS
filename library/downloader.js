var http = require('http');
var zip = require("node-native-zip-compression");
var async = require("async");
var request = require("request");
var fs = require("fs");
var EyeD3 = require('eyed3');
var eyed3 = new EyeD3({
    eyed3_executable: 'eyeD3'
});

module.exports = {
    "parseLyrics"   : function (content) {
        var lyrics = {};
        var RegexpSection = /<dd id="_lyrics_([0-9]+)">([\s\S]+?)<\/dd>/g
        while (match = RegexpSection.exec(content)) {
            lyrics[match[1]] = match[2];
        }

        return lyrics;
    },
    "start"         : function (pageUrl, next) {
        this.sendRequest(pageUrl, false, function (error, pageContent) {
            module.exports.parseAlbumPage(pageContent, function (error, albumData) {
                var songs = [];
                var lyrics = module.exports.parseLyrics(pageContent);
                async.each(
                    albumData.album.trackinfo,
                    function (item, callback) {
                        if (!item.file || item.file.length == 0) {
                            console.log("SKIPPED: " + JSON.stringify(item));
                        } else {
                            var lyricsKey = albumData.album.trackinfo.indexOf(item);
                            lyricsKey++;
                            var songLyrics = (lyricsKey && lyrics[lyricsKey]) ? lyrics[lyricsKey] : "";
                            var filename = lyricsKey + " - " + albumData.band.name + " - " + item.title + ".mp3";

                            if (filename.length > 200) {
                                filename = filename.substr(0, 196) + ".mp3";
                            }
                            module.exports.sendRequest(item.file["mp3-128"], filename, function (err, content) {
                                var songData = {
                                    "artist": albumData.band.name,
                                    "title" : item.title,
                                    "album" : albumData.album.current.title,
                                    "lyrics": songLyrics
                                };
                                songs.push([
                                    __dirname + "/../files/" + filename,
                                    filename
                                ]);
                                module.exports.editId3(
                                    __dirname + "/../files/" + filename,
                                    songData,
                                    callback
                                );
                            });
                        }
                    },
                    function (err) {
                        if (err) {
                            return next(err);
                        }

                        var zipName = albumData.band.name + " - " + albumData.album.current.title + ".zip";
                        zipName = zipName.replace(/\/+/g, "");
                        if (zipName.length > 200) {
                            zipName = zipName.substr(0, 196) + ".zip";
                        }

                        module.exports.createZip(songs, zipName, next);
                    }
                );
            })
        });
    },
    "createZip"     : function (files, outputName, next) {
        var memzip = new zip();

        for (file in files) {
            memzip.add(files[file][1], fs.readFileSync(files[file][0]));
            fs.unlink(files[file][0]);
        }

        memzip.toBuffer(function (zipBuffer) {
            fs.writeFile(
                __dirname + "/../files/" + outputName,
                zipBuffer,
                {"encoding": "binary"},
                next
            );
        });
    },
    "parseAlbumPage": function (content, next) {
        var jsContent = content.toString().match(/(var\s*BandData\s*=\s*\{[^<]+?)if \( /i);
        var objects = jsContent[1].split(";");
        return next(null, {
            "band" : eval(objects[0].replace(/var([^;]+)/, "$1")),
            "album": eval(objects[2].replace(/var([^;]+)/, "$1"))
        });
    },
    "sendRequest"   : function (url, writeTo, next) {
        console.log("RQ: " + url);
        if (writeTo) {
            var pipe = request(url).pipe(fs.createWriteStream(__dirname + "/../files/" + writeTo));
            pipe.on('finish', function () {
                return next();
            });
        } else {
            return request(url, function (error, response, body) {
                return next(error, body);
            });
        }
    },
    "editId3"       : function (path, data, next) {
        eyed3.updateMeta(
            path,
            {
                "artist": data.artist,
                "title" : data.title,
                "album" : data.album,
                "lyrics": data.lyrics
            },
            function (err) {
                if (err) {
                    console.log(err);
                }
                next(err);
            }
        );
    }
}