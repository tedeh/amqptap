#!/usr/bin/env node

var debug = require('debug')('amqptap');
var _ = require('lodash');
var program = require('commander');
var parseUrl = require('url').parse;
var amqp = require('amqp');
var domain = require('domain').create();
var util = require('util');
var eyes = require('eyes');

var VERSION = require(__dirname + '/package.json').version;
var FORMATS = ['json', 'eyes', 'plain'];
var TYPES = ['message', 'headers', 'deliveryInfo', 'all'];

program.version(VERSION)
  .option('-s, --server <url>', 'URL of AMQP server', parseUrl, 'amqp://localhost:5672/')
  .option('-e, --exchange <value>', 'Exchange to bind to')
  .option('-u, --username [value]', 'Username for authentication', 'guest')
  .option('-p, --password [value]', 'Password for authentication', 'guest')
  .option('-f, --format [' + FORMATS.join('|') + ']', 'Output format/inspector', parseFormat, 'json')
  .option('-r, --route [key]', 'Routing key', '#')
  .option('-t, --type [' + TYPES.join('|') + ']', 'Output object of type', parseType, 'message')
  .option('-g, --get [path]', 'Reach into outputted object using dot notation', parseGet, _.identity)
  .parse(process.argv);

domain.run(function() {

  var output = getOutputter(program.type, program.format, program.get);

  var connOptions = {
    host: program.server.hostname,
    port: parseInt(program.server.port, 10) || 5672,
    login: program.username,
    password: program.password,
    vhost: program.server.path || '/'
  };
  var conn = amqp.createConnection(connOptions);

  debug('connection settings %j', connOptions);

  conn.on('ready', function() {
    debug('connected');

    var queueOptions = {
      passive: false,
      durable: false,
      autoDelete: true
    };

    var queue = conn.queue('', queueOptions, function() {

      queue.bind(program.exchange, program.route, function() {
        debug('bound to %s', program.route);

        queue.subscribe(function(message, headers, deliveryInfo) {
          debug('message received');
          output(message, headers, deliveryInfo);
        });
      
      });
    
    });
  
  });

  conn.on('error', onError);
});

domain.on('error', onError);

function onError(err) {
  debug(err);
  console.error(err ? err.stack : 'Undefined Error');
  process.exit(-1);
}

function parseFormat(val) {
  return _.contains(FORMATS, val) ? val : undefined;
}

function parseType(val) {
  return _.contains(TYPES, val) ? val : undefined;
}

function parseGet(val) {
  return val ? _.partial(_.get, _, val) : undefined;
}

function getOutputter(type, format, get) {
  var output = console.log;

  var inspect = JSON.stringify;
  switch(format) {
    case 'plain': inspect = _.identity; break;
    case 'json': inspect = JSON.stringify; break;
    case 'eyes': inspect = eyes.inspector({stream: null}); break;
  }

  return function(message, headers, deliveryInfo) {
    var object = message;
    switch(type) {
      case 'message': object = message; break;
      case 'headers': object = headers; break;
      case 'deliveryInfo': object = deliveryInfo; break;
      case 'all': object = {message: message, headers: headers, deliveryInfo: deliveryInfo}; break;
    }

    output(inspect(get(object)));
  };
}
