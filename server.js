var express = require('express');
var app = express();
var passport = require('passport');
var session = require('express-session');
var bodyParser = require('body-parser');
var fs = require('fs');
var xml2js = require('xml2js');
var env = require('dotenv').load();
var parser = require('xml2json');
var cors = require('cors');
const path = require('path');
var moment = require('moment');
var sessionController = require('./app/controllers/sessioncontroller.js');
var cron = require('node-cron');
var DirectoryWatcher = require('directory-watcher');
//For BodyParser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/app/views'));
app.use(function(req, res, next) {
	res.header('Access-Control-Allow-Origin', '*');
	res.header(
		'Access-Control-Allow-Headers',
		'Origin, X-Requested-With, Content-Type, Accept'
	);
	next();
});
// For Passport
app.use(passport.initialize());
//Models
var models = require('./app/models');
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
DirectoryWatcher.create('./xmls', function(err, watcher) {
    watcher.once('change', function(files) {
		files.forEach(element => {
			fs.readFile(__dirname + '/xmls/'+ element, 'utf8',async (err, data) => {
				if(err) console.log(err);
				const json = parser.toJson(data);
				const programm = JSON.parse(json).tv.programme;
				const array = programm.map((el,i) => {
					let desc = '';
					if(el.desc) {
						if(el.desc['$t'].length > 120) {
							desc = el.desc['$t'].substr(0,120) + '...'
						} else {
							desc = el.desc['$t']
						}
					}
					let startDate = el.start.split(' ');
					let endDate = el.stop.split(' ');
					return {
						key: el.channel,
						startDate: moment(+startDate[0]).utc(startDate[1]).format('YYYY-DD-MM HH:mm'),
						endDate: moment(+endDate[0]).utc(endDate[1]).format('YYYY-DD-MM HH:mm'),
						title: el.title? el.title['$t'] : '',
						description: desc
					}
				})
				await models.epg.bulkCreate(array)
			} )
		});
      
    });

    watcher.on('delete', function(files) {
    
    });

    watcher.on('add', function(files) {
       for(let i = 0; i < 10; i++) {
		console.log('dfsdfsdf')
	   }
    });
});
//load passport strategies
require('./app/config/passport/passport.js')(passport, models.users);
app.get('/epg', async(req, res) => {
	const {key, startDate, endDate} = req.query;
	const test = await models.epg.findAll({where: {
		key: key,
		startDate: {
			$between: [startDate,endDate]
		}
	}})
	res.json(test);
	res.end();
})
// invoice operators
cron.schedule('* * 15 * *', async () => {
    try{
        await models.epg.destroy({where: {createdAt: {
			$lt:  moment(new Date()).add('-14', 'd').format('YYYY-MM-DD HH:mm')
		} }})
    } catch(err) {
        console.log(err)
    }
	
})
//Sync Database
models.sequelize
	.sync()
	.then(function() {
		console.log('Nice! Database looks fine');
	})
	.catch(function(err) {
		console.log(err, 'Something went wrong with the Database Update!');
	});

app.get('/', function(req, res) {
	res.sendFile(path.join(__dirname + '/app/views/operator/index.html'));
});
app.get('/admin', function(req, res) {
	res.sendFile(path.join(__dirname + '/app/views/admin/index.html'));
});
app.listen(5000, function(err) {
	if (!err) console.log('Site is live');
	else console.log(err);
});