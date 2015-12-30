#!/usr/bin/env node

var _ = require('lodash');
var program = require('commander');
var parseUrl = require('url').parse;
var amqp = require('amqp');
var domain = require('domain').create();
var util = require('util');
var inspect = _.partial(util.inspect, _, {
  depth: null,
  colors: true
});

var VERSION = require(__dirname + '/package.json').version;

program.version(VERSION)
  .option('-s, --server <url>', 'URL of AMQP server', parseUrl, 'amqp://localhost:5672')
  .option('-e, --exchange <value>', 'Exchange to bind to')
  .option('-u, --username [value]', 'Username for authentication', 'guest')
  .option('-p, --password [value]', 'Password for authentication', 'guest')
  .option('-v, --vhost [value]', 'Vhost', '/')
  .option('-f, --format [value]', 'Output format', ['json'])
  .option('-r, --route [value]', 'Routing key', '#')
  .parse(process.argv);

domain.run(function() {

  var connOptions = {
    host: program.server.host,
    port: parseInt(program.server.port, 10) || 5672,
    login: program.username,
    password: program.password,
    vhost: program.vhost
  };
  var conn = amqp.createConnection(connOptions);

  conn.on('ready', function() {

    var queueOptions = {
      passive: false,
      durable: false,
      autoDelete: true
    };

    var queue = conn.queue('', queueOptions, function() {

      queue.bind(program.exchange, program.route);

      queue.subscribe(function(message, headers, info) {
        console.log(inspect(message));
      });
    
    });
  
  });

  domain.on('error', function(err) {
    conn.disconnect();
    console.error(err);
    process.exit(-1);
  });

});
