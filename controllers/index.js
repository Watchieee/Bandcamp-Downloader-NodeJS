var downloader = require("./../library/downloader.js");

module.exports = {
    "index"   : function (request, response, next) {
        response.render('index');
    },
    "download": function (request, response, next) {
        var downloadUrl = request.param("bandcamp_url");

        if (downloadUrl.length == 0 || !downloadUrl.match(/\/album\//g)) {
            return response.redirect("/");
        }

        downloader.start(downloadUrl, function (error) {
            console.log("FINISH: " + downloadUrl);
            if (error) {
                return next(error);
            }
        });
        response.render('download');
    }
};