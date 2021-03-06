var express = require("express");
var app = express();
var passport = require("passport");
var session = require("express-session");
var bodyParser = require("body-parser");
var fs = require("fs");
var xml2js = require("xml2js");
var env = require("dotenv").load();
var parser = require("xml-parser");
var cors = require("cors");
const path = require("path");
var moment = require("moment");
var sessionController = require("./app/controllers/sessioncontroller.js");
var cron = require("node-cron");
var DirectoryWatcher = require("directory-watcher");
var chokidar = require("chokidar");
//For BodyParser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname + "/app/views"));
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});
// For Passport
app.use(passport.initialize());
//Models
var models = require("./app/models");
app.use((req, res, next) => {
  req.db = models;
  next();
});
app.use((req, res, next) => {
  if (req.body && req.body.sessionId) {
    sessionController(req, res, next);
  } else {
    next();
  }
});
var watcher = chokidar.watch(path.resolve(__dirname, "./xmls"), {
  ignored: /^\./,
  persistent: true
});

watcher
  .on("add", async function(path) {
    console.log("File", path, "has been added");
    var data = fs.readFileSync(path, "utf8");
    console.log(data.length);
    const el = await parser(data);
    const programm = el.root.children.filter(el => el.name == "programme");
    const result = programm.map(el => {
      return {
        name: el.name,
        startDate: moment(el.attributes.start, "YYYYMMDDHHmmss ZZ").format(
          "YYYY-MM-DD HH:mm"
        ),
        endDate: moment(el.attributes.stop, "YYYYMMDDHHmmss ZZ").format(
          "YYYY-MM-DD HH:mm"
        ),
        lang: el.children.find(h => h.name == "title")
          ? el.children.find(h => h.name == "title").attributes.lang
          : "ru",
        key: el.attributes.channel,
        title: el.children.find(h => h.name == "title")
          ? el.children.find(h => h.name == "title").content
          : null,
        description: el.children.find(h => h.name == "desc")
          ? el.children.find(h => h.name == "desc").content
          : null
      };
    });

    result.forEach(async el => {
      models.epg.create(el);
    });
  })
  .on("change", async function(path) {
    console.log("File", path, "has been changed");

    var data = fs.readFileSync(path, "utf8");
    console.log(data.length);
    const el = await parser(data);
    const programm = el.root.children.filter(el => el.name == "programme");
    const result = programm.map(el => {
      return {
        name: el.name,
        startDate: moment(el.attributes.start, "YYYYMMDDHHmmss ZZ").format(
          "YYYY-MM-DD HH:mm"
        ),
        endDate: moment(el.attributes.stop, "YYYYMMDDHHmmss ZZ").format(
          "YYYY-MM-DD HH:mm"
        ),
        lang: el.children.find(h => h.name == "title")
          ? el.children.find(h => h.name == "title").attributes.lang
          : "ru",
        key: el.attributes.channel,
        title: el.children.find(h => h.name == "title")
          ? el.children.find(h => h.name == "title").content
          : null,
        description: el.children.find(h => h.name == "desc")
          ? el.children.find(h => h.name == "desc").content
          : null
      };
    });

    result.forEach(async el => {
      models.epg.create(el);
    });
  })
  .on("unlink", function(path) {
    console.log("File", path, "has been removed");
  })
  .on("error", function(error) {
    console.error("Error happened", error);
  });

//load passport strategies
require("./app/config/passport/passport.js")(passport, models.users);
app.get("/epg", async (req, res) => {
  const { key, startDate, endDate, lang } = req.query;
  const test = await models.epg.findAll({
    where: {
      key: key,
      lang: lang ? lang : "ru",
      startDate: {
        $between: [startDate, endDate]
      }
    }
  });
  res.json(test || []);
  res.end();
});
// invoice operators
cron.schedule("* * 15 * *", async () => {
  try {
    await models.epg.destroy({
      where: {
        createdAt: {
          $lt: moment(new Date())
            .add("-14", "d")
            .format("YYYY-MM-DD HH:mm")
        }
      }
    });
  } catch (err) {
    console.log(err);
  }
});
//Sync Database
models.sequelize
  .sync()
  .then(function() {
    console.log("Nice! Database looks fine");
  })
  .catch(function(err) {
    console.log(err, "Something went wrong with the Database Update!");
  });

app.get("/", function(req, res) {
  res.sendFile(path.join(__dirname + "/app/views/operator/index.html"));
});
app.get("/admin", function(req, res) {
  res.sendFile(path.join(__dirname + "/app/views/admin/index.html"));
});
app.listen(5000, function(err) {
  if (!err) console.log("Site is live");
  else console.log(err);
});
