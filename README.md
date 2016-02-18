# amqptap

Sometimes it is difficult to know what goes on in your RabbitMQ exchanges. `amqptap` is a CLI tool written in node.js that helps you get a better look at the messages that get passed around!

[repo]: https://github.com/tedeh/amqptap
[amqplib-repo]: https://github.com/squaremo/amqp.node
[amqptap-npm]: https://www.npmjs.com/package/amqptap
[amqptap-travis]: https://travis-ci.org/tedeh/amqptap
[rabbitmq-url]: https://www.rabbitmq.com/uri-spec.html
[badge-travis]: https://img.shields.io/travis/tedeh/amqptap/master.svg?style=flat-square
[badge-npm]: https://img.shields.io/npm/v/amqptap.svg?style=flat-square

[![travis build status][travis-img]][amqptap-travis] 
[![npm][badge-npm]][amqptap-npm]

## Installation

Install amqptap with `npm install -g` and you should have the `amqptap` executable accessible in your `PATH`.

## Usage

For a list of all options run `amqptap --help`.

`amqptap` creates an exclusive queue that is bound to the specified exchange, and will receive all messages on that exchange without interfering with other bound queues.

The server URL is specified using the `-s` or `--server` flag set to a value that corresponds to the [RabbitMQ URI specification][rabbitmq-url].

Almost feature-complete URL for connecting to `foo.bar` using port 1234, vhost `baz`, username `tester` and password `password`: `amqp://tester:password@foo.bar:1234/baz`

Without a specific server set, `amqptap` attempts to connect to a RabbitMQ server running on localhost using the guest account.

### Picking fields from the result

Given a raw message output (see "Automatic deserialization") from [amqplib][amqplib-repo] coming on `amq.topic` with routing key `foo.bar` that looks like this.

````javascript
{
  "fields": {
    "consumerTag": "amq.ctag-NFOFYLaMHMzMXD4PwHuLog",
    "deliveryTag": 1,
    "redelivered": false,
    "exchange": "amq.topic",
    "routingKey": "foo.bar"
  },
  "properties": {
    "contentType": "application/json",
    "headers": {
      "test": 2
    },
    "deliveryMode": 1
  },
  "content": {
    "hello": "world!"
  }
}
````

#### Picking a single field

Fields are picked using the flag `-f` or `--fields` with the notation of the [lodash get function](https://lodash.com/docs#get).

````
$ amqptap -f properties.deliveryMode
1
````

#### Picking multiple fields using comma as a separator

````
$ amqptap -f properties.contentType,fields.routingKey
{"properties.contentType": "application/json", "fields.routingKey": "foo.bar"}
````

### Setting the routing key

The routing key can be set with the `-r` or `--route` flag.

````
$ amqptap -r "bar#"
````

### Changing the exchange

The default exchange bound to is always `amq.topic`. This can be changed with the `-e` or `--exchange` flag.

````
$ amqptap -e "amq.fanout"
````

### Inspector types

`amqptap` supports some inspectors with the `-i` or `--inspector` option that mutates the value before sending it to stdout.

````
$ amqptap -i eyes
"pretty colored output using npm package eyes"

$ amqptap -i json
"plain JSON output without indentation"

$ amqptap -i string
"output is passed through String()"
````

## Automatic deserialization

By default, raw buffers are returned for the `content` field.

Messages with a `contentType` header equal to `application/json` or `text/json` will have the `content` field automatically parsed with `JSON.parse`.

Messages with a `contentType` header equal to `text/plain` will be parsed with `Buffer.prototype.toString`.

## Tests

Running tests require guest access to a RabbitMQ server. The test runner is by default set to attempt a connection to `amqp://localhost` but this value can be overriden by setting the environment variable AMQP_URL according to the [RabbitMQ URI specification][rabbitmq-url].

To run the tests, execute `npm test`.

## Contributions

Most welcome by submitting pull requests to [the repository][repo].
