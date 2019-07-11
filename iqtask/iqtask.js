/*
 * Copyright (c) 2017-present Sonatype, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');
const taskLib = require('vsts-task-lib/task');

const serverUrl = taskLib.getInput('serverUrl', true);
const serverUsername = taskLib.getInput('serverUsername', true);
const serverPassword = taskLib.getInput('serverPassword', true);
  
const useProxy = taskLib.getBoolInput('useProxy');
const proxyHost = taskLib.getInput('proxyHost', useProxy);
const proxyPort = taskLib.getInput('proxyPort', useProxy);
const proxyUserName = taskLib.getInput('proxyUsername', useProxy);
const proxyPassword = taskLib.getInput('proxyPassword', useProxy);

const applicationId = taskLib.getInput('applicationId', true);
const stage = taskLib.getInput('stage', true);
const scanDirectory = taskLib.getInput('scanDirectory', true);
const scanTargets = taskLib.getDelimitedInput('scanTargets', ',', true);

const tempDirectory = path.join('C:\\', `nexus_iq_vsts_${taskLib.getVariable('build.buildId')}`);


runCli().then((policyEvaluationResult) => {
  reportResults(policyEvaluationResult).then(() => {
  });
});

function reportResults(policyEvaluationResult) {
  return new Promise((resolve, reject) => {
    
    fs.mkdir(tempDirectory, (error) => {
      if (error) {
        reject(error);
      }

      const tempLocation = path.join(tempDirectory, 'Nexus-IQ-Policy-Evaluation');
      const reportMarkdown = [
        `[Application Composition Report](${policyEvaluationResult.reportUrl})`,
        '>Policy Violations',
        `>>Critical: ${policyEvaluationResult.policy_critical}`,
        `>>Severe: ${policyEvaluationResult.policy_severe}`,
        `>>Moderate: ${policyEvaluationResult.policy_moderate}`,
        `>>Grandfathered: ${policyEvaluationResult.grandfathered}`,
        '---',
        '>Components Affected',
        `>>Critical:  ${policyEvaluationResult.component_critical}`, 
        `>>Severe: ${policyEvaluationResult.component_severe}`,
        `>>Moderate: ${policyEvaluationResult.component_moderate}`
      ].join('\n');
      
      fs.writeFile(tempLocation, reportMarkdown, (error) => {
        if (error) {
          reject(error);
        }

        taskLib.command('task.uploadsummary', {}, tempLocation);

        if (policyEvaluationResult.fail) {
          const failureSummary = [
            `Application Composition Report: ${policyEvaluationResult.reportUrl}`,
            `Policy Critical: ${policyEvaluationResult.policy_critical}`,
            `Policy Severe: ${policyEvaluationResult.policy_severe}`,
            `Policy Moderate: ${policyEvaluationResult.policy_moderate}`,
            `Policy Grandfathered: ${policyEvaluationResult.grandfathered}`,
            `Components Critical: ${policyEvaluationResult.components_critical}`,
            `Components Severe: ${policyEvaluationResult.components_severe}`,
            `Components Moderate: ${policyEvaluationResult.components_moderate}`
          ].join('\n');
          taskLib.setResult(taskLib.TaskResult.Failed, `Nexus IQ reports policy failing:\n${failureSummary}`);
        }

        resolve();
      });
    });
  });
}

function runCli() {
  return new Promise((resolve, reject) => {
    const cliJarLocation = path.join(__dirname, 'nexus-iq-cli-1.68.0-01.jar');
    let parameters = [
      `-i ${applicationId}`,
      `-s ${serverUrl}`,
      `-a ${serverUsername}:${serverPassword}`
    ];
    if (useProxy) {
      parameters.push([
        `--proxy ${proxyHost}:${proxyPort}`,
        `--proxy-user ${proxyUserName}:${proxyPassword}`
      ]);
    }
    if (stage) {
      parameters.push([
        `--stage ${stage}`
      ]);
    }
    const parameterString = parameters.join(' ');
    const scanTargetsString = taskLib.findMatch('', scanTargets).map((target) => {
      return `"${target}"`
    }).join(' ');

    const jarString = `java -jar "${cliJarLocation}" ${parameterString} ${scanDirectory}`;

    exec(jarString, { maxBuffer: 1024 * 1000 }, (error, stdout, stderr) => {
      console.log(error);
      console.log(stderr);
      console.log(stdout);

      
      const infoArray = stdout.match(/\[INFO\] \*{93}([\S\s]*)\[INFO\] \*{93}/)[1].split(`[INFO] `);
      // console.log('infoArray -----');
      // console.log(infoArray);

      const components = infoArray[3].match(/affected: (\d*) critical, (\d*) severe, (\d*) moderate/);
      // console.log('components -----');
      // console.log(components);

      const violations = infoArray[4].match(/violations: (\d*) critical, (\d*) severe, (\d*) moderate/);
      // console.log('violations -----');
      // console.log(violations);

      const grandfathered = infoArray[5].match(/violations: (\d*)/);
      // console.log('grandfathered -----');
      // console.log(grandfathered);

      // const reportUrl = infoArray[6].match(/The detailed report can be viewed online at (.*)[^\r\n]/);
      const reportUrl = infoArray[6].match(/The detailed report can be viewed online at (.*)/);
      // console.log('reportUrl -----');
      // console.log(reportUrl);


      resolve({
        policy_critical: violations[1],
        policy_severe: violations[2],
        policy_moderate: violations[3],
        component_critical: components[1],
        component_severe: components[2],
        component_moderate: components[3],
        grandfathered: grandfathered[1],
        reportUrl: reportUrl[1],
        fail: !!error
      });
    });
  });
}