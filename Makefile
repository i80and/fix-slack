.PHONY: lint clean

all: fix-slack.xpi

fix-slack.xpi: fix-slack/* fix-slack/icons/*
	$(MAKE) lint
	cd fix-slack && zip -r ../$@ .

node_modules: package.json
	npm update

lint: | node_modules
	./node_modules/.bin/eslint ./fix-slack
	./node_modules/.bin/flow

clean:
	rm -f fix-slack.xpi
