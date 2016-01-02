var _ = require('lodash');
var mocha = require('mocha');
var should = require('should');
var when = require('when');
var exec = require('child_process').exec;
var amqp = require('amqplib');
var AMQPTap = require(__dirname + '/../');

var AMQP_URL = process.env['AMQP_URL'] || 'amqp://localhost'

describe('amqptap', function() {

  describe('instance', function() {

    var tap = null;
    beforeEach(function() {
      tap = new AMQPTap();
    });

    describe('_getFields', function() {

      it('should return the object as given when option not specified', function() {
        tap.options.fields = null;
        var o = {a: 3};
        tap._getFields(o).should.equal(o);
      });

      it('should return the object as given when option is exactly "."', function() {
        tap.options.fields = '.';
        var o = {a: 3};
        tap._getFields(o).should.equal(o);
      });

      it('should return a single deep field if option is string', function() {
        tap.options.fields = 'a.b.c';
        tap._getFields({a: {b: {c: 3}}}).should.equal(3);
      });

      it('should return an object of fields deep picked from the object if option is array', function() {
        tap.options.fields = ['a.b0', 'a.b1'];
        tap._getFields({a: {b0: 2, b1: 4, b2: 9}}).should.deepEqual({'a.b0': 2, 'a.b1': 4});
      });
    
    });

    describe('_format', function() {

      var o = {asdf: 3};

      it('should return JSON.stringify() if option not specified', function() {
        tap.options.format = null;
        tap._format(o).should.equal(JSON.stringify(o));
      });

      it('should return JSON.stringify() if option is "json"', function() {
        tap.options.format = 'json';
        tap._format(o).should.equal(JSON.stringify(o));
      });

      it('should return String() if option is "string"', function() {
        tap.options.format = 'string';
        tap._format('asdf').should.equal('asdf');
      });

      it('should return eyes.inspector() if option is "eyes"', function() {
        tap.options.format = 'eyes';
        tap._format(o).should.equal(require('eyes').inspector({stream: null})(o));
      });

      it('should return the data as is if option is "object"', function() {
        tap.options.format = 'object';
        tap._format(o).should.equal(o);
      });
    
    });

    describe('_parse', function() {

      it('should return the buffer as given if not given a contentType', function() {
        var buf = new Buffer('hello');
        tap._parse(buf).should.equal(buf);
      });

      it('should parse as JSON if contentType is text/json or application/json', function() {
        var obj = {hello: 'world'};
        var buf = new Buffer(JSON.stringify(obj));
        tap._parse(buf, 'application/json').should.deepEqual(obj);
        tap._parse(buf, 'text/json').should.deepEqual(obj);
      });

      it('should parse as String if contentType is text/plain', function() {
        var str = 'Hello, World!';
        var buf = new Buffer(str);
        tap._parse(buf, 'text/plain').should.equal(str);
      });
    
    });
  
  });

  describe('amqp server', function() {

    describe('string message', function() {

      var state = getState({
        format: 'string'
      });

      before(state.setup);
      after(state.teardown);

      it('should read a simple message', function(done) {
        var write = 'Hello, World!';
        return state.tap.open().then(function() {
          state.publish(write).then(function() {
            return state.read(true).then(function(read) {
              read.should.equal(write);
              done();
            });
          });
        });
      });
    
    });

    describe('object message', function() {

      var state = getState({
        format: 'object'
      });

      before(state.setup);
      after(state.teardown);

      it('should write and read an object', function(done) {
        var write = {hello: 'world!'};
        return state.tap.open().then(function() {
          state.publish(write).then(function() {
            return state.read().then(function(read) {
              read.should.deepEqual(write);
              done();
            });
          });
        });
      });
    
    });
  
  });

});

function getState(tapOptions) {
  tapOptions = tapOptions || {};

  var state = {

    tap: null,
    conn: null,

    setup: function() {
      return amqp.connect(AMQP_URL).then(function(newConn) {
        state.conn = newConn;
        state.tap = new AMQPTap(tapOptions);
      });
    },

    teardown: function() {
      return state.conn.close();
    },

    publish: function(content, options) {
      options = options || {};
      return state.conn.createConfirmChannel().then(function(ch) {
        var routingKey = options.routingKey || '#';
        if(_.isPlainObject(content)) {
          content = new Buffer(JSON.stringify(content));
          options.contentType = 'application/json';
          options.contentEncoding = 'utf8';
        } else if(_.isString(content)) {
          content = new Buffer(content);
          options.contentType = 'text/plain';
          options.contentEncoding = 'utf8';
        }
        return ch.publish('amq.topic', routingKey, content, options);
      });
    },

    read: function(castToString) {
      castToString = _.isBoolean(castToString) ? castToString : false;
      var deferred = when.defer();
      state.tap.on('data', function(buf) {
        if(castToString) buf = buf.toString('utf8');
        deferred.resolve(buf);
        state.tap.close();
      });
      return deferred.promise;
    }

  };

  return state;
}
