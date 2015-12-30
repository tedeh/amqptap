# amqptap

Sometimes it is difficult

Easy-to-use CLI utility to tap messages from RabbitMQ exchanges

[repo]: https://github.com/tedeh/amqptap

## Installation

Install amqptap with `npm install -g` and you should have the executable accessible in your `PATH`.

## Usage

### Authentication

### Setting the routing key

### Message types

### Different formatters

### Reaching into deep objects

## Tests

Running tests require guest access to a RabbitMQ server. The test runner is by default set to attempt a connection to `amqp://localhost` but this value can be overriden by setting the environment variable AMQP_URL.

To run the tests, execute `npm test`.

## Contributions

Most welcome by submitting pull requests to [the repository][repo].
