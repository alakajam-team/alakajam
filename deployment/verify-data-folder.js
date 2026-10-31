#!/usr/bin/env node

const fs = require('fs');
const config = require('../config');

fs.mkdirSync(config.DATA_PATH, { recursive: true });
