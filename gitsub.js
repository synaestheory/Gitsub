#!/usr/bin/env node
/*jslint node: true */
"use strict";
var Promise     = require('bluebird'),
    fs          = Promise.promisifyAll(require('graceful-fs')),
    path        = require('path'),
    exec        = require('child-process-promise').exec,
    _           = require('underscore'),
    chalk       = require('chalk');


// var program     = require('commander');
// program
//     .option('-q, --quiet', 'Reduce output to screen')
//     .option('-s, --subonly', 'Sync submodules only, skip parent module update')
//     .action(function() {
//         console.time(chalk.green('git submodule sync'));
//         if(program.subonly) {
//             syncModules();
//         } else {
//             var cmd = 'git pull && git submodule update --init --recursive';
//             execAsync(cmd)
//             .catch(function(error) {
//                 console.log('Error:\n', error);
//             })
//             .then(function(result) {
//                 console.log(result[0]);
//                 syncModules();
//             });
//         }
//     })
//     .parse(process.argv);

console.time(chalk.green('git submodule sync'));
// var cmd = 'git pull && git submodule update --init --recursive';
// exec(cmd)
// .catch(function(error) {
//     console.log(error.stderr);
// })
// .then(function(result) {
//     if(typeof result.stderr != 'undefined') {
//         console.log(result.stderr);
//         syncModules();
//         return {status: 'success', message: result.stderr};
//     }
    syncModules();
// });

function syncModules() {
    var gitModulesFile = path.resolve('.gitmodules');
    if(gitModulesFile) {
        var promises = [];
        var gitModules = fs.readFileAsync(gitModulesFile, 'utf8')
        .then(function(data) {
            return data.match(/path\s=\s(.+)/g)
                       .map(function(v) {return v.replace('path = ', '');});
        })
        .then(function(data) {
            data.forEach(function(v,k) {
                var cmd = 'git -C ./'+ v +' checkout develop && ' +
                          'git -C ./'+ v +' pull';
                var gitPromise = exec(cmd)
                .catch(function(error) {
                    var errString = error.stderr.split('\n');
                    errString.unshift(0);
                    errString.join('\n');
                    return errString;
                    // /Already on/
                    // /Previous HEAD position/
                    // /Your branch is up-to-date/
                })
                .then(function(result) {
                    if(typeof result.stderr != 'undefined') {
                        return {status: 'success', station: v, message: result.stderr};
                    } else {
                        result.splice(0,2);
                        result.pop();
                        return {status: 'error', station: v, message: result.join('\n')};
                    }
                });

                promises.push(gitPromise);
                // console.log(promises);
            });

            Promise.all(promises)
            .then(function(results) {
                var errors = [];
                var sortedResults = _.sortBy(results, 'station');
                sortedResults.map(function(result) {
                    // if(result.status === 'success' && !program.quiet) {console.log(result.message.trim(), "\t" + result.station.trim());}
                    if(result.status === 'success') {console.log(result.message.trim(), "\t" + result.station.trim());}
                    if(result.status === 'error') {errors.push(result.station + ":\n" + result.message);}
                });
                if(!!errors.length) {
                    console.log(chalk.red.underline('\n\t=== ERRORS ==='));
                    errors.map(function(error) {console.log(chalk.red(error));});
                }
                console.log();
                console.timeEnd(chalk.green('git submodule sync'));
            });
        })
        .catch({code: 'ENOENT'}, function(error) {
            console.log(chalk.red('.gitmodules file not found'));
        })
        .catch(function(error) {
            console.log(error);
        });
    }
}
