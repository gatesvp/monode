var mongodb = require('mongodb');

var mongo = {
  "hostname":"localhost",
  "port":27017,
  "username":"",
  "password":"", 
  "name":"",
  "db":""
}

var generate_mongo_url = function(obj){
  obj.hostname = (obj.hostname || 'localhost');
  obj.port = (obj.port || 27017);
  obj.db = (obj.db || 'test');

  if(obj.username && obj.password){
    return "mongodb://" + obj.username + ":" + obj.password + "@" + obj.hostname + ":" + obj.port + "/" + obj.db;
  }
  else{
    return "mongodb://" + obj.hostname + ":" + obj.port + "/" + obj.db;
  }
}

var mongourl = generate_mongo_url(mongo);

mongodb.connect(mongourl, function(err, conn){
  conn.collection('ips', function(err, coll){
    /* Simple object to insert: ip address and date */
    object_to_insert = { 'ip': '12345', 'ts': new Date() };
    
	  /* Insert the object then print in response */
    /* Note the _id has been created */
    coll.insert( object_to_insert, {safe:true}, function(err){
      if(err) { console.log(err); process.exit(); }
      else { console.log("Got There"); process.exit(); }
    });
  });
});
