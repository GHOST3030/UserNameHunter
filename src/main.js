import chalk from 'chalk';
import { LogBanner, LogAttempt, LogInfo, LogWarn } from './Logger.js';
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

async function waitForServer() {
    let serverOnline = await checkServerConnection();
    while (!serverOnline) {
        LogWarn('بانتظار الاتصال بالشبكة...');
        await delay(5000);
        serverOnline = await checkServerConnection(url);
    }
}

export async function run() {
    await waitForServer();

    for (let _ = 0; _ < count; _++) {
        const startt = Date.now();
        const newModified = LastModified();
        if (newModified !== LstModi) {
            LogInfo('تم اكتشاف تغيير في الإعدادات، جارِ إعادة التحميل...');
            config;
            LstModi = newModified;
            LogInfo('تم تطبيق الإعدادات الجديدة!');
        }

        let username = generateUsername();
        if (tested.has(username)) {
            continue;
        }
        tested.add(username);
        AddtoFile(username);
        i++;

        try {
            const response = await sendRequest(username);
            const isValid = checkfromResponse(response);
            const ms = Date.now() - startt;

            LogAttempt(i, username, isValid, ms);

            if (isValid && logout_url) {
                Logout(username);
            }
        } catch (err) {
            console.log(chalk.red(`  ✗ ${username}  فشل الطلب: ${err.code || err.message}`));
            await waitForServer();
            continue;
        }
    }

    LogInfo('تم الانتهاء.');
};
