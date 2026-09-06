import axios from "axios";
import { url, headers } from "./variables.js";

/**
 * Parses the hotspot's post-login "status" page (the same HTML a
 * successful login/re-login returns) into a plain details object.
 * Field names match the page's own element ids / script calls.
 */
export function parseCardStatus(html) {
    if (typeof html !== 'string') {
        return null;
    }

    const grab = (pattern) => {
        const m = html.match(pattern);
        return m ? m[1] : null;
    };

    const remainBytesTotal = grab(/id="remain_bytes_total"[\s\S]*?toArabicBytes\("(\d+)"\)/);
    const bytesOut = grab(/id="bytes_out"[\s\S]*?toArabicBytes\("(\d+)"\)/);
    const bytesIn = grab(/id="bytes_in"[\s\S]*?toArabicBytes\("(\d+)"\)/);
    const sessionTimeLeft = grab(/id="session_time_left"[\s\S]*?toArabicTime\("([^"]+)"\)/);
    const uptime = grab(/id="uptime"[\s\S]*?toArabicTime\("([^"]+)"\)/);
    const speed = grab(/dsplit\("([^"]+)",\s*0\)/);

    const isStatusPage = remainBytesTotal !== null || sessionTimeLeft !== null;
    if (!isStatusPage) {
        return null;
    }

    return {
        remainBytesTotal: remainBytesTotal ? Number(remainBytesTotal) : null,
        bytesOut: bytesOut ? Number(bytesOut) : null,
        bytesIn: bytesIn ? Number(bytesIn) : null,
        sessionTimeLeft,
        uptime,
        speed
    };
}

/**
 * Builds the 'domain' query param the hotspot's own status page uses
 * to change a card's speed tier and/or its "updates" toggle, e.g.
 * 'middle_' (updates on) or 'middle_Uoff' (updates off).
 */
export function buildUpdateDomain(speed, updatesEnabled) {
    return `${speed}_${updatesEnabled ? '' : 'Uoff'}`;
}

/**
 * Sends the same GET request the status page's own speed/update
 * dropdowns send, then re-fetches the status page so the caller gets
 * back fresh, parsed details reflecting the change.
 */
export async function updateCard(username, speed, updatesEnabled) {
    const domain = buildUpdateDomain(speed, updatesEnabled);

    await axios.get(url, {
        params: { username, domain },
        headers,
        timeout: 5000
    });

    const response = await axios.get(url, {
        params: { username, verify: 'callBack' },
        headers,
        timeout: 5000
    });

    return parseCardStatus(response.data);
}
