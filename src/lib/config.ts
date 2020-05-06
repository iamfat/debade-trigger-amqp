import * as fs from 'fs';
import * as minimist from 'minimist';
import { parse } from 'yaml';

var argv = minimist(process.argv.slice(2));
var configFile = process.env.DEBADE_CONF || argv.c || './config/debade.yml';

export default parse(fs.readFileSync(configFile, 'utf8'));
