import { parse } from 'yaml';
import { readFileSync } from 'node:fs';

export default function Config(path: string) {
    const content = readFileSync(path, 'utf-8');
    return parse(content);
}
