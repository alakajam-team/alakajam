#!/bin/sh

const config = require('../config');
const mkdirp = require('mkdirp');

mkdirp(config.DATA_PATH);
