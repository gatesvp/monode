var fs = require('fs');
var util = require('util');
var bson = require('./bson/bson').BSON;
var objectid = require('./bson/objectid').ObjectID;

//fs.unlinkSync('temp.out');
var data = {x:1, y:2};
var _id = new objectid();
var file_name = util.format('data/%s.json', _id.toHexString());
var binary_data = bson.serialize(data);

fs.writeFile(file_name, binary_data, 'UTF-8', function(err){
  if(err) { throw err; }
  else {
    fs.readFile(file_name, function(err, file_buffer){
      if(err) { throw err; }
      else {
        console.log(bson.deserialize(file_buffer));
      }
    });
  }
});

/*
fs.readFile('data.json', 'UTF-8', function(err, data) {
  if(err) { throw err; }
  else {
    var obj = JSON.parse(data);
    fs.writeFile('temp.out', bson.serialize(obj), 'UTF-8', function(err) {
      if(err) throw err;
      console.log("saved");
    });
  }
});
*/
