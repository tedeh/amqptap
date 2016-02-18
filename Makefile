SHELL:=/bin/bash -O extglob

lint:
	./node_modules/.bin/jshint -c .jshintrc lib/*.js bin/*.js

.PHONY: lint
