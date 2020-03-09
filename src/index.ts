#!/usr/bin/env node

import shelljs from 'shelljs';
import commander from 'commander';
import _ from 'lodash';
import { JpsEntry } from './JpsEntry';
import pidusage from 'pidusage';
import prettyMs from 'pretty-ms';
import prettyBytes from 'pretty-bytes';
import chalk from 'chalk';
import inquirer from 'inquirer';

shelljs.config.fatal = true;

commander
  .name('exo')
  .description('Utility to exorcise сritters from outer planes (like Gradle daemons) written in godblessed language')

const checkJpsInstalled = () => {
  if (shelljs.which('jps') === null) {
    console.log(`Command 'jps' is not found. You PC is innocent, nothing to banish here.`);
    console.log(`If you still think it is possessed by daemons check your PATH variable and re-run exo.`);
    process.exit(0);
  }
};

const commandNameByPid = (pid: number): string => {
  const { stdout } = shelljs.exec(`ps -p ${ pid } -o command`, { silent: true });
  return _(stdout).split('\n').drop(1).take(1).first()!;
};

const colorizeMemory = (bytes: number): (s: string) => string => {
  if (bytes > 1e9) return chalk.red;
  if (bytes > 1e8) return chalk.yellow;
  return chalk.green;
};

const colorizedCommand = (s: string): string => {
  const splitAt = _.lastIndexOf(s, '/');

  return _.truncate(s, { length: 32 }) + chalk.green(s.slice(splitAt));
};

const main = async () => {
  commander.parse(process.argv);
  checkJpsInstalled();
  const { stdout } = shelljs.exec('jps -l', { silent: true });
  let entries = _(stdout)
    .split('\n')
    .map(_.trim)
    .reject(_.isEmpty)
    .map((line) => new JpsEntry(line))
    .value();
  const choices = [];

  for (const jpsEntry of entries) {
    if (jpsEntry.javaClass.includes('sun.tools.jps.Jps')) continue;
    try {
      let command = commandNameByPid(jpsEntry.pid);
      const pCommand = colorizedCommand(command);
      const { memory, elapsed } = await pidusage(jpsEntry.pid);
      const pElapsed = prettyMs(elapsed, { unitCount: 2 }).padStart(11);
      const pMem = colorizeMemory(memory)((prettyBytes(memory).padStart(8)));
      const pPid = jpsEntry.pid.toString().padStart(6);
      choices.push({
        elapsed,
        name: `${ pPid } | ${ pElapsed } | ${ pMem } | ${ pCommand }`,
        short: jpsEntry.pid.toString(),
        value: jpsEntry.pid,
        checked: command.includes('GradleDaemon'),
      });
    } catch (e) {
      // pid exited nothing to do
    }
  }
  const { pids } = await inquirer
    .prompt([
      {
        type: 'checkbox',
        name: 'pids',
        message: chalk.bold(' Pid    | Running for |  Memory  | Command\n'),
        choices: _.orderBy(choices, 'elapsed', 'desc'),
      },
    ]);

  for (let pid of pids) {
    process.stdout.write(`Killing pid=${ pid }...`);
    try {
      shelljs.exec(`kill ${ pid }`, { silent: true });
      console.log(chalk.green(' OK'));
    } catch (e) {
      console.log(chalk.red(' ERROR'));
    }
  }
  pidusage.clear();

};

// noinspection JSIgnoredPromiseFromCall
main();