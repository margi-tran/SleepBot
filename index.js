var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var app = express();
var cookieParser = require('cookie-parser');
var MongoClient = require('mongodb').MongoClient;
var path = require('path');

var fbVerificationHandler = require('./facebook/verification_handler');
var webhook = require('./facebook/webhook');
var convertDate = require('./utility/convert_date')

var fbMessengerBot = require('fb-messenger-bot-api');
var fbMessengerBotClient = new fbMessengerBot.Client(process.env.FB_PAGE_ACCESS_TOKEN);
var MessengerBot = require('messenger-bot');
var messengerBotClient = new MessengerBot({token:process.env.FB_PAGE_ACCESS_TOKEN});

var Fitbit = require('fitbit-node');
var client = new Fitbit(process.env.FITBIT_CLIENT_ID , process.env.FITBIT_CLIENT_SECRET);
var redirectUri = process.env.REDIRECT_URL;
var scope = 'activity heartrate location nutrition profile settings sleep social weight';

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cookieParser());

app.set('port', (process.env.PORT || 5000));
app.listen(app.get('port'), () => {
    console.log('Running on port', app.get('port'));
});

app.get('/', async (req, res) => {
  	try {
  		/*const db = await MongoClient.connect(process.env.MONGODB_URI);
  		const testcollection = db.collection('firstcol');
  		var query = {};
  		const result = await testcollection.find(query).toArray();

  		res.send(result);*/

  		res.send('Margi\'s project');
  	} catch (err) {
  		console.log('[ERROR]', err);
  	}
});

app.get('/', fbVerificationHandler);

app.post('/webhook/', webhook);

app.get('/fitbit', function(req, res) {
	res.redirect(client.getAuthorizeUrl(scope, redirectUri));
});

app.get('/fitbit_oauth_callback', async (req, res) => {
	try {
		accessTokenPromise = await client.getAccessToken(req.query.code, redirectUri);
		//profile = await client.get("/profile.json", accessTokenPromise.access_token);
		//sleep = await client.get('/sleep/date/' + convertDate(new Date()) + '.json', accessTokenPromise.access_token);
		//water = await client.get('/foods/log/water/date/' + convertDate(new Date()) + '.json', accessTokenPromise.access_token);

		sleepData = await client.get('/sleep/date/' + convertDate(new Date()) + '.json', accessTokenPromise.access_token);

		db = await MongoClient.connect(process.env.MONGODB_URI);
        newUser = { fbUserId_: fbUserId, 
                    fitbitId_: accessTokenPromise.user_id,
                    accessToken: accessTokenPromise.access_token,
                    refreshAccessToken: accessTokenPromise.refresh_token };
        await db.collection('fitbitauths').insertOne(newUser);
        db.close();


		res.send("ok");
		fbMessengerBotClient.sendTextMessage(fbUserId, 'Great, you have given me permission to access to fitbit');
		//m1 = 'Great! You have given me permission to access your health data on Fitbit.';
		//m2 = 'First, I would like to get an idea about your current sleep health so I\' going to ask you a few questions.';
	} catch (err) {
		res.send(err);
	}
});

/*
 * On the user's first time chatting to the bot, they are directed to this route.
 * This allows the user's Facebook ID to be correctly linked their Fibit ID.
 */
app.get('/prepare_fitbit_auth', (req, res) => {
	fbUserId = req.query.fbUserId;
	res.cookie('fbUserId', fbUserId);
	res.sendFile(path.join(__dirname + '/html_files/prepare_fitbit_auth.html'));
});