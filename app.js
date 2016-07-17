var express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer');
var path = require("path");
var md5 = require("md5");
var fs = require("fs");
var moment = require('moment');
var app = express();
var chalk = require('chalk');
var schedule = require('node-schedule');
var rest = require('restler');
var stringify = require('json-stringify-safe');
var error = chalk.bold.red;
var request = require('request')

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
   extended: false
}));
app.use(express.static('./uploads'));


var storage = multer.diskStorage({
    destination: 'uploads/',
    filename: function(req, file, cb) {
        cb(null, md5(Date.now()) + path.extname(file.originalname));
    },
    onFileUploadComplete: function(file) {
        console.log(file);
    }
})

var upload = multer({
    storage: storage
}).single('file');

app.post('/upload', upload , function (req, res, next) {
	var file_name = req.protocol + '://' + req.get('host') +"/"+req.file.filename;
	console.log(file_name);
	request.post({
  		headers: {'Ocp-Apim-Subscription-Key' : '76b062a978934ba8a46356a423904d78', 'Content-Type' : 'application/json'},
  		uri    : 'https://api.projectoxford.ai/vision/v1.0/describe',
  		body   : { 'url' : 'http://www.childrensuniversity.co.uk/media/26720/activites_2_497x395.jpg'},
  		json: true,
  		responseType: 'buffer',
	}, function(error, response, body){
		res.setHeader('Content-Type', 'application/json');
		switch(response.statusCode){
			case 400:
			case 500:
			case 415:
				jsonResponse = {'status' : 'failed', 'error' : body.message};
				res.status(200).send(JSON.parse(stringify(jsonResponse)));
			break;
			case 200:
				jsonResponse = {'status' : 'success', 'description' : body.description.captions[0].text};
				res.status(200).send(JSON.parse(stringify(jsonResponse)));
			break;
			case 401:
				jsonResponse = {'status' : 'failed', 'error' : 'Subscription Key Invalid'};
				res.status(200).send(JSON.parse(stringify(jsonResponse)));
			break;
			default:
				jsonResponse = {'status' : 'failed', 'error' : 'Could not make request'};
				res.status(200).send(JSON.parse(stringify(jsonResponse)));
			break;

		}
	});
});

app.listen(3000, function () {
  console.log('emotion app listening on port 3000!');
});

var j = schedule.scheduleJob('15 * * * *', function(){
  cleanupFiles(function(err,data){
	console.log('peroidic cleaning done');
  });
});

app.post('/cleanup', function (req, res, next) {
	cleanupFiles(function(err,data){
		return res.status(200).send(data);
	});
});


function rest_api_call(res, file_name){
	rest.post('https://api.projectoxford.ai/vision/v1.0/analyze', {
	  header: {'Ocp-Apim-Subscription-Key' : '76b062a978934ba8a46356a423904d78'},
	  body : {url : file_name},
	}).on('complete', function(data, response) {
	  // if (response.statusCode == 201) {
	    // console.log(response);
	  // }
	  res.status(200).send(response);
	});
}


function cleanupFiles(callback){
	return fs.readdir("uploads", function (err, files){
		return files.forEach (function(file){
			var path = "./uploads/"+file;
			var stats = fs.statSync(path);
			var startTime = moment(stats['birthtime']);
			var end  = moment().diff(startTime, 'minutes');
			if (end > 15) {
				fs.unlink(path, function(err, data){
					console.log(path+"deleted"+"data"+data);
				});
			}
			callback(null,'success');

		})
	});

}