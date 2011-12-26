var bson = require('./bson/bson').BSON;
var net = require('net');
var constants = require('./constants').constants;
var objectid = require('./bson/objectid').ObjectID;

exports.insertHandler = function(socket, header, data){

  // First four bytes of query are the flags
  var flags = data.readInt32LE(0, false);

  // Next is a null-terminated collection name
  var fullCollectionName = "";
  for(i = 3; i++; i < data.length) {
    if(data[i] == 0) { break; }
    fullCollectionName += String.fromCharCode(data[i]);
  }
  i++; // skip the null;

  // Deserialize the actual data to store
  var message_data = bson.deserialize(data.slice(i));

  console.log("  Query: Flags: %s - NS: %s", flags, fullCollectionName);
  console.log("  Message:" + JSON.stringify(message_data));

  var ns = fullCollectionName.split('.');
  var dbName = ns[0];
  delete ns[0];
  var collectionName = ns.join('');

  console.log("  DB: %s - Collection %s", dbName, collectionName);

  return "";

}

