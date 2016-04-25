#!/usr/bin/env node
/*jslint node: true */
"use strict";
var Promise     = require('bluebird'),
    fs          = Promise.promisifyAll(require('graceful-fs')),
    path        = require('path'),
    exec        = require('child-process-promise').exec,
    _           = require('lodash/fp'),
    chalk       = require('chalk');

var log = console.log.bind(console);
function errLog() {
    log(chalk.red.apply([].prototype.slice.call(arguments)));
}
var logStderr = _.flow(_.property('stderr'), errLog);
var flags = process.argv.filter(function(v) {return v.indexOf('--') === 0;});
const BRANCH_FLAG = flags.length > 0 ? flags[0].replace('--', '') : null;

console.log('Performing \'git pull\' and \'git submodule update\'');
console.time(chalk.green('git submodule sync'));
exec('git pull && git submodule update --init --recursive')
.catch(logStderr)
.then(submoduleUpdateSuccessHandler);

function submoduleUpdateSuccessHandler(result) {
    if(typeof result.stderr != 'undefined') {
        console.log(result.stderr);
        syncModules();
        return {status: 'success', message: result.stderr};
    }
    syncModules();
}

function submodulePullErrorHandler(error) {
   return [0].concat(_.tail(error.stderr.split('\n')));
    // /Already on/
    // /Previous HEAD position/
    // /Your branch is up-to-date/
}

function submodulePullSuccessHandler(submodule, result) {
    if(typeof result.stderr != 'undefined') {
        return {status: 'success', submodule: submodule, message: result.stderr};
    } else {
        return {status: 'error', submodule: submodule, message: result.slice(1).join('\n')};
    }
}

function handleResults(results) {
    var errors = _.sortBy('submodule')(results)
    .filter(_.flow(_.property('status'), _.eq('error')))
    .map(function(error) {
        return error.submodule + ':\n' + error.message;
    });

    if(!!errors.length) {
        console.log(chalk.red.underline('\n\t=== ERRORS ==='));
        errors.map(function(error) {errLog(error);});
    }
    console.log();
    console.timeEnd(chalk.green('git submodule sync'));
}

function parseSubmodules(data) {
    return data.match(/path\s=\s(.+)/g)
               .map(function(str) {return str.replace('path = ', '');});
}

function checkoutAndPull(submodule) {
    var gitCommand = 'git -C ./' + submodule;
    var checkout = gitCommand +' checkout '+ BRANCH_FLAG;
    var pull = gitCommand +' pull';

    log('Pulling: ' + submodule + (BRANCH_FLAG ? ':' + BRANCH_FLAG : ''));

    return exec(BRANCH_FLAG ? checkout + ' && ' + pull : pull)
    .catch(submodulePullErrorHandler)
    .then(submodulePullSuccessHandler.bind(null, submodule));
}

var pullSubmodules = _.flow(parseSubmodules, _.map(checkoutAndPull));

function syncModules() {
    var gitModulesFile = path.resolve('.gitmodules');

    if(gitModulesFile) {
        console.log('Indexing submodules...');
        fs.readFileAsync(gitModulesFile, 'utf8')
        .then(pullSubmodules)
        .then(handleResults)
        .catch({code: 'ENOENT'}, function() {
            errLog('.gitmodules file not found');
        })
        .catch(log);
    }
}
