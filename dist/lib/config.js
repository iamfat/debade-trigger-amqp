"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const minimist = require("minimist");
const yaml_1 = require("yaml");
var argv = minimist(process.argv.slice(2));
var configFile = process.env.DEBADE_CONF || argv.c || './config/debade.yml';
exports.default = yaml_1.parse(fs.readFileSync(configFile, 'utf8'));
