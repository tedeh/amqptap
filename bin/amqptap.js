#!/usr/bin/env node

var _ = require('lodash');
var program = require('commander');
var domain = require('domain').create();
var AMQPTap = require(__dirname + '/..');

var VERSION = require(__dirname + '/../package.json').version;
var INSPECTORS = ['json', 'eyes', 'string'];

program.version(VERSION)
  .option('-u, --url <url>', 'url of amqp server (amqp://user:pass@host:port/vhost)', 'amqp://guest:guest@localhost:5672/')
  .option('-e, --exchange [value]', 'exchange name to bind to', 'amq.topic')
  .option('-i, --inspector [' + INSPECTORS.join('|') + ']', 'output inspector', parseInspector, 'json')
  .option('-f, --fields [values]', 'desired output field(s)', parseFields)
  .option('-r, --route [key]', 'routing key', '#')
  .parse(process.argv);

domain.run(function() {

  var tap = new AMQPTap({
    url: program.url,
    exchange: program.exchange,
    route: program.route,
    fields: program.fields,
    format: program.inspector
  });

  tap.open();

  tap.pipe(process.stdout);

  tap.on('close', function() {
    process.exit(0);
  });

});

domain.on('error', function(err) {
  console.error(err.stack);
  process.exit(-1);
});

function parseInspector(val) {
  return _.contains(INSPECTORS, val) ? val : undefined;
}

function parseFields(val) {
  var list = val.split(',');
  return list.length === 1 ? _.first(list) : list;
}
