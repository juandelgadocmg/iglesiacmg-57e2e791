import crypto from "node:crypto";

const method = "/v1/request/callback/";
const params = { from: "301311", to: "3134567481" };

// Sort keys
const sortedKeys = Object.keys(params).sort();
const queryParams = new URLSearchParams();
sortedKeys.forEach(k => queryParams.append(k, params[k]));
const queryStr = queryParams.toString();

const secret = "20d18884fda09f1f8587";
const key = "fb94530cb765f6d212e2";

const md5 = crypto.createHash("md5").update(queryStr).digest("hex");
const data = method + queryStr + md5;
const hmac = crypto.createHmac("sha1", secret).update(data).digest("base64");

console.log("Signature:", hmac);
