var _ = require('lodash');
var ReadableStream = require('stream').Readable;
var inherits = require('util').inherits;
var amqp = require('amqplib');
var debug = require('debug')('amqptap');
var eyes = require('eyes');

/**
 * @name AMQPTap
 * @summary Opens a connection to an AMQP server and starts emitting messages over the Stream interface
 * @param {Object} [options] - Extends this.options
 * @param {String} [options.url] - AMQP server URL
 * @param {String} [options.exchange="amq.topic"] - Exchange to bind our queue to
 * @param {String} [options.route="#"] - Routing key to use for exchange-queue binding
 * @param {String|Array} [options.fields="content"] - One specific field to get, or a combination
 * @param {String} [options.format] - Function used to convert selected data to a String
 * @extends {stream.Readable}
 */
var AMQPTap = module.exports = function(options) {
  options = options || {};

  ReadableStream.call(this, {
    objectMode: options.format === 'object'
  });

  this.conn = null;
  this.options = _.defaults(options, {
    url: 'amqp://guest:guest@localhost:5672/',
    exchange: 'amq.topic',
    route: '#',
    fields: 'content'
  });
};
inherits(AMQPTap, ReadableStream);

/**
 * @summary _read stub
 */
AMQPTap.prototype._read = function() {
  this._paused = false;
};

/**
 * @summary Open the tap
 * @return {Promise}
 */
AMQPTap.prototype.open = function() {
  var self = this;
  var options = this.options;

  debug('connecting to %s', options.url);
  return amqp.connect(options.url).then(function(conn) {
    debug('connected');
    self.conn = conn;

    return conn.createChannel().then(function(ch) {
      debug('channel created');

      var queueOptions = {
        exclusive: true,
        durable: false,
        autoDelete: true
      };

      return ch.assertQueue(null, queueOptions).then(function(ok) {
        debug('queue asserted');

        var queueName = ok.queue;

        return ch.bindQueue(queueName, options.exchange, options.route, {}).then(function() {
          debug('queue %s bound to %s (%s)', queueName, options.exchange, options.route);

          ch.consume(queueName, function(msg) {
            debug('message received on queue');

            var props = msg.properties;
            msg.content = self._parse(msg.content, props.contentType, props.contentEncoding);

            var fields = self._getFields(msg);
            var inspected = self._format(fields);

            if(self._paused || !self.push(inspected)) {
              self._paused = true;
            }
          });

        });

      });

    });

  });

};

/**
 * @summary Close the tap
 * @return {Promise}
 */
AMQPTap.prototype.close = function() {
  return this.conn.close();
};

/**
 * @summary Get a function to convert AMQP message data
 * @param {Object} data
 * @return {String}
 */
AMQPTap.prototype._format = function(data) {
  switch(this.options.format) {
    default:
    case 'json': return JSON.stringify(data);
    case 'eyes': return eyes.inspector({stream: null})(data);
    case 'string': return String(data);
    case 'object': return data;
  }
};

/**
 * @summary Get the correct fields from a AMQP message according to settings
 * @param {Object} data
 * @return {Object}
 */
AMQPTap.prototype._getFields = function(data) {
  var fields = this.options.fields;
  if(!fields || fields === '.') return data;
  if(!_.isArray(fields)) return _.get(data, fields);
  return _.reduce(fields, function(out, field) {
    out[field] = _.get(data, field);
    return out;
  }, {});
};

/**
 * @summary Parses a message content buffer
 * @param {Buffer} buf
 * @param {String} [contentType]
 * @param {String} [encoding]
 * @return {Object}
 */
AMQPTap.prototype._parse = function(buf, contentType, encoding) {
  encoding = encoding || 'utf8';
  switch(contentType) {
    default: return buf;
    case 'text/json':
    case 'application/json': return JSON.parse(buf.toString(encoding));
    case 'text/plain': return buf.toString(encoding);
  }
};
