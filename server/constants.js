var constants = {};
constants.OP_REPLY = 1;
constants.OP_MSG = 1000;
constants.OP_UPDATE = 2001;
constants.OP_INSERT = 2002;
constants.OP_GET_BY_OID = 2003;
constants.OP_QUERY = 2004;
constants.OP_GET_MORE = 2005;
constants.OP_DELETE = 2006;
constants.OP_KILL_CURSORS = 2007;
constants.OPTS_NONE = 0;
constants.OPTS_TAILABLE_CURSOR = 2;
constants.OPTS_SLAVE = 4;
constants.OPTS_OPLOG_REPLY = 8;
constants.OPTS_NO_CURSOR_TIMEOUT = 16;
constants.OPTS_AWAIT_DATA = 32;
constants.OPTS_EXHAUST = 64;

constants.DEFAULT_PORT = 27017;

exports.constants = constants;
