'use strict';

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var request = require('request');
// var bcrypt = require('bcrypt');
// var crypto = require('crypto');
// var yelp = require('./App/Utils/api');
// var nodemailer = require('nodemailer');
// var gmailKeys = require('./App/Utils/apiKeys').gmailKeys;
// var formattedDateHtml = require('./App/Utils/dateFormatter');
// var generateEmail = require('./App/Utils/emailGenerator');
// var boundingBoxGenerator = require('./App/Utils/boundingBoxGenerator');
// var roamOffGenerator = require('./App/Utils/roamOffGenerator');
// var saltRounds = 10;

//Frantic_Rust Requires
var config = require('../api_keys.js');
var twilio = require('twilio');
var googleMapsApiKey = require('../api_keys.js');

var client = new twilio.RestClient(config.twilioKeys.accountSid, config.twilioKeys.authToken);

var fetch = require('node-fetch');
const googlemaps_API = 'https://maps.googleapis.com/maps/api/distancematrix/json?';
const mongoDB_API_KEY = 'yjH4qEJR-Olag89IaUTXd06IpuVDZWx1';
const baseLink_users = 'https://api.mlab.com/api/1/databases/frantic-rust-roam/collections/users?apiKey=';
const baseLink_users_query = 'https://api.mlab.com/api/1/databases/frantic-rust-roam/collections/users/';
const baseLink_history = 'https://api.mlab.com/api/1/databases/frantic-rust-roam/collections/history?apiKey=';
const baseLink_roams = 'https://api.mlab.com/api/1/databases/frantic-rust-roam/collections/roams?apiKey=';
const baseLink_verified = 'https://api.mlab.com/api/1/databases/frantic-rust-roam/collections/verified?apiKey=';

var checkSignup = (username, phone, res) => {
  fetch(baseLink_verified + mongoDB_API_KEY)
    .then((response) => response.json())
      .then((responseData) => {
        var usernameFlag = false;
        var phoneFlag = false;
        for (var i = 0; i < responseData.length; i++) {
          if (responseData[i].username === username) {
            usernameFlag = true;
          }
          if (responseData[i].phone === phone) {
            phoneFlag = true;
          }
        }
        if (usernameFlag && phoneFlag) {
          res.sendStatus(400);
        } else if (usernameFlag) {
          res.sendStatus(401);
        } else if (phoneFlag) {
          res.sendStatus(402);
        } else {
          console.log('signup good to go');
        }
      });
}

var getUser = (username, password, res) => {
  fetch(baseLink_users + mongoDB_API_KEY)
    .then((response) => response.json())
      .then((responseData) => {
        var flag = false;
        var id, name, usernameFetched, passwordFetched, currentlocation, phone, code, verifiedPhone;
        for (var i = 0; i < responseData.length; i++) {
          if (responseData[i].username === username && responseData[i].password === password) {
            id = responseData[i]._id.$oid;
            name = responseData[i].name;
            usernameFetched = responseData[i].username;
            passwordFetched = responseData[i].password;
            currentlocation = responseData[i].currentlocation;
            phone = responseData[i].phone;
            code = responseData[i].verificationCode;
            verifiedPhone = responseData[i].verifiedPhone;
            flag = true;
            break;
          }
        }
        const returnObj = {
          id: id,
          name: name,
          username: usernameFetched,
          password: passwordFetched,
          phone: phone,
          currentlocation: currentlocation,
          verificationCode: code,
          verifiedPhone: verifiedPhone
        };
        if (flag) {
          res.status(200).send(returnObj);
        } else {
          res.sendStatus(402);
        }
      });
};

module.exports = {
  
  signup: (req, res) => {
    const name = req.body.name;
    const username = req.body.username;
    const password = req.body.password;
    const phone = req.body.phone;
    const currentlocation = req.body.currentlocation;
    const verificationCode = req.body.verificationCode;
    const verifiedPhone = req.body.verifiedPhone;

    const obj = {
      name: name,
      username: username,
      password: password,
      phone: phone,
      currentlocation: currentlocation,
      verificationCode: verificationCode,
      verifiedPhone: verifiedPhone
    };
    console.log('obj.......', obj);

    checkSignup(obj.username, obj.phone, res);

    fetch(baseLink_users + mongoDB_API_KEY,
    {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(obj)
    })
    .then( err => {
      getUser(obj.username, obj.password, res);
    }).catch((err) => {
        console.log('did not post user info');
        res.sendStatus(400);
    });
  },

  signin: (req, res) => {
    console.log('Logging in: ', req.body);
    const username = req.body.username;
    const password = req.body.password;
    getUser(username, password, res);
  },

  sendSMS: (req, res) => {
    var code = req.body.code;
    var phoneNumber = req.body.phoneNumber;
    var name = req.body.name;
    client.sendSms({
      to:'+1' + phoneNumber,
      from:'+19259058241',
      body:'Greetings ' + name + ', welcome to Roam!\n\nYour unique code: ' + code
    }, function(error, message) {
        if (!error) {
          console.log('Success! The code is:' + code);
          console.log('Message sent on:');
          console.log(message.dateCreated);
        } else {
          console.log('Oops! There was an error.');
        }
      });
  },

  checkCode: (req, res) => {
    var realCode = req.body.code;
    var inputCode = req.body.codeSubmitted;
    if (realCode === inputCode) {
      res.sendStatus(200);
    } else {
      res.sendStatus(400);
    }
  },

  verifyUser: (req, res) => {
    var verifiedObj = {
      username: req.body.user.username,
      phone: req.body.user.phone,
    };

    fetch(baseLink_verified + mongoDB_API_KEY,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verifiedObj)
      }).then(res => res.json())
      .then(responseData => console.log(responseData));

    fetch(baseLink_users_query + req.body.id + '?apiKey=' + mongoDB_API_KEY,
    {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        },
      body: JSON.stringify( { "$set" : {verifiedPhone: true}})
    });
  },

  isUserVerified: (req, res) => {
    console.log(req.body.id);
    fetch(baseLink_users_query + req.body.id + '?apiKey=' + mongoDB_API_KEY)
    .then((res) => res.json())
    .then((responseData) => {
      console.log(responseData);
      if(responseData.verifiedPhone) {
        res.sendStatus(200);
      } else {
        res.sendStatus(400);
      }
    });
  },
// amend old commit git

  //Page to set up event between users, making API calls to YELP
  roam: (req, res) => {
    //if no match found create a pending roam node
    if (matchResults[0].data.length === 0) {
    console.log('nomatch');
      var searchParams = {
        term: 'Bars',
        limit: 20,
        sort: 0,
        radius_filter: 3200, //2-mile radius
        bounds: coords.maxLat + ',' + coords.minLong + '|' +  coords.minLat  + ',' + coords.maxLong
      };      

      //Creates the YELP object to make API request to yelp servers
      yelp.searchYelp(searchParams, function(venue) {
        
        var venueName = venue.name;
        var venueAddress = venue.location.display_address.join(' ');

        //Create a roam node if it doesn't exist
        apoc.query('CREATE (m:Roam {creatorEmail: "%userEmail%", creatorLatitude: %userLatitude%, creatorLongitude: %userLongitude%, creatorRoamStart: %startRoam%, creatorRoamEnd: %roamOffAfter%, status: "Pending", venueName: "%venueName%", venueAddress: "%venueAddress%"})', { email: userEmail, userEmail: userEmail, userLatitude: coords.userLatitude, userLongitude: coords.userLongitude,
      startRoam: times.startRoam, roamOffAfter: times.roamOffAfter, venueName: venueName, venueAddress: venueAddress }).exec().then(function(queryRes) {

          // creates the relationship between creator of roam node and the roam node
          apoc.query('MATCH (n:User {email:"%email%"}), (m:Roam {creatorEmail: "%creatorEmail%", creatorRoamStart: %roamStart%}) CREATE (n)-[:CREATED]->(m)', {email:userEmail, creatorEmail: userEmail, roamStart: times.startRoam} ).exec().then(function(relationshipRes) {
             console.log('Relationship created', relationshipRes); 
          });
        });
      });
    } else { //Roam node found within a similar geographic location
      console.log('Found a match', matchResults[0].data[0].meta[0].id);

      var id = matchResults[0].data[0].meta[0].id;

      //Grabs roam node between similar location, and creates the relationship between node and user
      apoc.query('MATCH (n:User {email:"%email%"}), (m:Roam) WHERE id(m) = %id% SET m.status="Active" CREATE (n)-[:CREATED]->(m) RETURN m', {email:userEmail, id:id} ).exec().then(function(roamRes) {
          console.log('Relationship created b/w Users created', roamRes[0].data[0].row[0]);
          var roamInfo = roamRes[0].data[0].row[0];

          var date = formattedDateHtml();

          //Generates an automatic email message
          var mailOptions = {
            from: '"Roam" <Roamincenterprises@gmail.com>', // sender address 
            bcc: roamInfo.creatorEmail + ',' + userEmail, // List of users who are matched
            subject: 'Your Roam is Ready!', // Subject line 
            text: 'Your Roam is at:' + roamInfo.venueName + ' Roam Address: ' + roamInfo.venueAddress, // plaintext body 
            html: generateEmail(roamInfo.venueName, roamInfo.venueAddress, date) // html body 
          };
           
          // send mail with defined transport object 
          transporter.sendMail(mailOptions, function(error, info){
            if(error){
              return console.log(error);
            }
            console.log('Message sent: ' + info.response);
          });

          res.send("You have been matched"); 
        });
      }
  }
};

createNewRoam = (username, userLat, userLong) => {
  var obj = {
    username1: username,
    username2: '',
    venueLatitude: '',
    venueLongitude: '',
    address: '',
    venue: '',
    date: ''
  };

  function pickRandomCategory() {
    var categories = ['bar', 'restaurant', 'theatre'];
    return categories[Math.floor(Math.random() * categories.length)];
  };
  ;
  //set limit: 1 so we only return back one search result
  //hardcode radius_filter for 2 miles
  //sample yelp api request looks like https://api.yelp.com/v2/search?term=german+food&location=Hayes&cll=37.77493,-122.419415
    var searchParams = {
      term: pickRandomCategory(),
      limit: 1,
      radius_filter: 3200, //2-mile radius
      cll: userLat + ',' + userLong
    };

    yelp.searchYelp(searchParams, function(venue) {
      
      var venueName = venue.name;
      var venueAddress = venue.location.display_address.join(' ');
      //post to roam database all the details

      //send back a confirmation response or not found
    }

  }

  fetch(baseLink_roams + mongoDB_API_KEY,
  {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(obj)
  });

}
//MATCHING ALGORITHM
roam: (req, res) => {

  var availableRoams = [];
  var username = req.body.username;
  var userLongitude = req.body.longitude;
  var userLatitude = req.body.latitude;
  var radius = req.body.radius;
  var transportation = req.body.transporation;
  //Search database for existing roams
  fetch(baseLink_users + mongoDB_API_KEY)
  .then( (response) => {
    //if no existing roams, create new roam
    if(response.length === 0) {
      createNewRoam(username, userLatitude, userLongitude);
    } else {
      //access the coordinates of existing roams
      //compare to current user's location to find roams within x mi radius
      for(var i=0; i<response.length; i++) {
        var roamLat = response[i].latitude;
        var roamLong = response[i].longitude;
        var distance; 

        var origin = 'origins=' + userLongitude + ',' + userLongitude;
        var destination = '&destinations=' + roamLat + ',' + roamLong;
        var apiKey = '&key=' + googleMapsApiKey;

        googleMapsPath = googlemaps_API + origin + destination + apiKey;

        request(googleMapsPath, (err, res, body) => {
          if(!error && response.statusCode === 200) {
            distance = res.rows.elements[0].distance //always in meters
          }
        });

        //if it is within the radius, add it to an array
        if(distance <= radius) {
          availableRoams.push(response[i]);
        }
      }
      //if no roams match radius requirement, create new roam
      if(availableRoams.length === 0) {
        createNewRoam()
      } else {
        var selectedRoam = availableRoams[Math.floor(Math.random() * availableRoams.length)];
        selectedRoam.username2 = username;
        var timeToMeet = new Date();
        selectRoam.date = timeToMeet.setHours(timeToMeet.getHours() + 1);
      }
    }
  })
  .then(res.send(selectedRoam));
}

    //if no roams are within the radius, create new roam
    //else randomly select from the list of roams and pair current user 

  //If no existing roams in db or no roams that match user's radius requirement, create new roam


  //Query database for current user's info (set usercurrentLocation with lat and long)
  fetch(baseLink_users_query + req.body.id + '?apiKey=' + mongoDB_API_KEY)
  .then((response) => response.json())
  .then((responseData) => {
    userCurrentlocation = {
      longitude: responseData.longitude,
      latitude: responseData.latitude
    }
  }
  //Run through the list of users and find all the users that are within an x mile radius (pythagorean theorem?)
  fetch(baseLink_users + mongoDB_API_KEY)
  .then((response) => response.json())
  .then((responseData) => {
    var flag = false;
    var id, name, usernameFetched, passwordFetched, currentlocation, phone;
    for (var i = 0; i < responseData.length; i++) {
      if (responseData[i].username === username && responseData[i].password === password) {
        id = responseData[i]._id.$oid;
        name = responseData[i].name;
        usernameFetched = responseData[i].username;
        passwordFetched = responseData[i].password;
        currentlocation = responseData[i].currentlocation;
        phone = responseData[i].phone;
        flag = true;
        break;
      }
    });
  },
  
};