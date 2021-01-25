const fs = require('fs');
const chalk = require('chalk');

const modifyEnv = (transform) => {
    const env = require('dotenv').config().parsed;
    transform(env);
    return env;
};

const writeEnv = (transform) => {
    let out = '';
    const modified = modifyEnv(transform);
    for (const [key, val] of Object.entries(modified)) {
        out += `${key}="${val}"\n`;
        console.log(`Wrote ${chalk.green('.env')} variable ${chalk.yellow(key)}`);
    }
    fs.writeFileSync('.env', out);
}

module.exports = {
    modifyEnv,
    writeEnv,
}