import assert from 'assert';
import { normalizeUrlForMetrics } from '../metrics';

const cases = [
    {
        input: 'http://zen-demo-java-danger.internal:8080/',
        expected: 'java_danger'
    },
    {
        input: 'https://zen-demo-php.on-forge.com/',
        expected: 'php'
    },
    {
        input: 'http://zen-demo-nodejs-esm.internal:3000/api/v1',
        expected: 'nodejs_esm'
    },
    {
        input: 'https://example.com:9443/path',
        expected: 'example'
    }
];

cases.forEach(({ input, expected }) => {
    const actual = normalizeUrlForMetrics(input);
    assert.strictEqual(actual, expected, `Expected "${input}" to normalize to "${expected}", got "${actual}"`);
});

console.log('normalizeUrlForMetrics tests passed');
