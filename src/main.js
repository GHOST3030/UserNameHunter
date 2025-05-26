import chalk from 'chalk';
import { LogBanner, LogVaild, LogInvaild } from './Logger.js';
import {
    sendRequest, Logout, checkServerConnection, generateUsername,
    delay, AddtoFile, checkfromResponse, LoadUsernamesToTest
}
    from './Utils.js'
import { url, logout_url, count, config } from './variables.js';
import { LastModified } from './config.js';
const TOOL_NAME = "GhostUsernameHunter";
let LstModi = LastModified();
let tested = LoadUsernamesToTest();

let i = 0;
let c = 0;
LogBanner(TOOL_NAME);
export async function run() {
    for (let _ = 0; _ < count; _++) {
        let serverOnline = await checkServerConnection();
        while (!serverOnline) {
            console.log(chalk.green(`[+] Waiting for network connection...`));
            await delay(5000);
            serverOnline = await checkServerConnection(url);
        }

        const startt = Date.now();
        const newModified = LastModified();
        if (newModified !== LstModi) {
            console.log(chalk.yellow("\n[*] Detected change in config.json, reloading..."));
            config;
            LstModi = newModified;
            console.log(chalk.cyan("[+] New settings applied!"));
        }
        let username = generateUsername();
        if (tested.has(username)) {//console.log(_);
            continue
        };
        tested.add(username);
        AddtoFile(username);
        i++;

        

        console.log(chalk.magenta(`[DEBUG] Testing ${username} (#${i})`));

try {
           const response = await sendRequest(username);

        if (checkfromResponse(response)) {
            LogVaild(username);
            if (logout_url) {
                Logout(username);
            }
        } else {
            LogInvaild(username);

        }

        const end = Date.now();
        console.log(chalk.gray(`Token Time: ${end - startt} ms`));

}
 catch (err) {
    console.log(chalk.red(`[!] Request failed for ${username}: ${err.code || err.message}`));
    continue; 
}


    }

    console.log(chalk.cyan("\n[*] Done."));
};
