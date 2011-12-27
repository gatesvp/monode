var fs = require('fs');
var bson = require('./bson/bson').BSON;
var net = require('net');
var constants = require('./constants').constants;
var objectid = require('./bson/objectid').ObjectID;
var path = require('path');

exports.insertHandler = function(socket, header, data){

  // First four bytes of query are the flags
  // TODO ContinueOnError (0) flag.
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

  var collectionPath = __dirname + "/data/" + dbName + "/" + collectionName;

  mkdirP(collectionPath, 0777, function() {
    console.log("full path created");
    _writeData(collectionPath, message_data);
  });

  // Create an op header containing a reply header
  // These are intermediary objects and may be removed later
  var replyHeader = { requestID: header.requestID, responseTo: header.requestID, opCode: 1 };
  var opHeader = { header: replyHeader , responseFlags:4, cursorID:0, startingFrom:0, numberReturned:1 };

  // Figure out the buffer size and then instantiate it.
  replyHeader.messageLength = (16 + 20); // reply header + op header + serialized documents

  var serialized_response = new Buffer(replyHeader.messageLength);

  // Populate response buffer with header data
  serialized_response.writeInt32LE(replyHeader.messageLength,0);
  serialized_response.writeInt32LE(replyHeader.requestID, 4);
  serialized_response.writeInt32LE(replyHeader.responseTo, 8);
  serialized_response.writeInt32LE(replyHeader.opCode, 12);
  serialized_response.writeInt32LE(opHeader.responseFlags, 16);
  serialized_response.writeInt64LE(opHeader.cursorID, 20);
  serialized_response.writeInt32LE(opHeader.startingFrom, 28);
  serialized_response.writeInt32LE(opHeader.numberReturned, 32);

  console.log("Response length %s", serialized_response.length);

  return serialized_response;

}

_writeData = function(collectionPath, message_data){

  // Ensure that an ID is defined (or create one)
  if(!message_data._id) { message_data._id = new objectid(); }

  var file_name = collectionPath + "/" + message_data._id + ".js";
  var binary_data = bson.serialize(message_data);

  fs.writeFile(file_name, binary_data, 'UTF-8', function(err){
    if(err) { throw err; }
    else {
      return true
    }
  });
}

mkdirP = function (p, mode, f) {
    var cb = f || function () {};
    if (p.charAt(0) != '/') { cb('Relative path: ' + p); return }
    
    var ps = path.normalize(p).split('/');
    path.exists(p, function (exists) {
        if (exists) cb(null);
        else mkdirP(ps.slice(0,-1).join('/'), mode, function (err) {
            if (err && err.errno != process.EEXIST) cb(err)
            else {
              console.log("Created folder %s", p);
              fs.mkdir(p, mode, cb);
            }
        });
    });
};

