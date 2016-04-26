#!/usr/bin/env node
/*jslint node: true */
"use strict";
var Promise     = require('bluebird'),
    fs          = Promise.promisifyAll(require('graceful-fs')),
    path        = require('path'),
    spawn       = require('child-process-promise').spawn,
    exec        = require('child-process-promise').exec,
    _           = require('lodash/fp'),
    chalk       = require('chalk');

var log = console.log.bind(console);
function errLog() {
    log(chalk.red.apply([].prototype.slice.call(arguments)));
}
var logStderr = _.flow(_.property('stderr'), errLog);
var flags = process.argv.filter(function(v) {return v.indexOf('--') === 0;});
const BRANCH_FLAG = flags.length > 0 ? flags[0].replace('--', '') : 'master';

console.time(chalk.green('git submodule sync'));
console.log(`updating main repository and initializing submodules:`);
spawn('git', ['pull'], {stdio: 'inherit'})
.then(__ => spawn('git', ['submodule', 'update', '--init', '--recursive'], {stdio: 'inherit'}))
.then(syncModules);

function submodulePullErrorHandler(error) {
   return [0].concat(_.tail(error.stderr.split('\n')));
}

function submodulePullSuccessHandler(submodule, result) {
    if(typeof result.stderr === 'undefined') {
        return {status: 'error', submodule: submodule, message: result.slice(1).join('\n')};
    } else {
        return {status: 'success', submodule: submodule, message: result.stderr};
    }
}

function parseSubmodules(data) {
    return data.match(/path\s=\s(.+)/g)
               .map(function(str) {return str.replace('path = ', '');});
}

function checkoutAndPull(submodule) {
    var gitCommand = 'git -C ./' + submodule;
    var checkout = gitCommand +' checkout '+ BRANCH_FLAG;
    var pull = gitCommand +' pull';

    log('Pulling: ' + submodule + ':' + chalk.blue(BRANCH_FLAG));

    return exec(checkout)
    .then(__ => exec(pull))
    .catch(submodulePullErrorHandler)
    .then(submodulePullSuccessHandler.bind(null, submodule));
}

var pullSubmodules = _.flow(parseSubmodules, _.map(checkoutAndPull));

function handleResults(results) {
  var errors = _.sortBy('submodule')(results)
  .filter(_.flow(_.property('status'), _.eq('error')))
  .map(function(error) {
    return error.submodule + ':\n' + error.message;
  });

  if(errors.length) {
    console.log(chalk.red.underline('\n\t=== ERRORS ==='));
    errors.map(function(error) {errLog(error);});
  }
  console.log();
  console.timeEnd(chalk.green('git submodule sync'));
}

function syncModules() {
  var gitModulesFile = path.resolve('.gitmodules');

  if(gitModulesFile) {
    console.log('Indexing submodules...');
    fs.readFileAsync(gitModulesFile, 'utf8')
    .then(pullSubmodules)
    .then(results => Promise.all(results).then(handleResults))
    .catch({code: 'ENOENT'}, function() {
      errLog('.gitmodules file not found');
    })
    .catch(log);
  }
}
