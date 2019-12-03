#!/bin/bash

set -ex


curl -L https://raw.githubusercontent.com/tj/n/master/bin/n -o n
node --version || echo ""

npm i -g last-git-changes
last-git-changes --exclude='docs,examples,scripts,README.md,LICENSE,CONTRIBUTING.md'

# buildkite-agent pipeline upload .buildkite/trigger.yml
