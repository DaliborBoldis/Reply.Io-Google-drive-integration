const fs = require("fs");
const express = require("express");
const { google } = require("googleapis");
const { OAuth2 } = google.auth;
const app = express();
const path = require("path");
const dotenv = require("dotenv");
const { exec } = require("child_process");

dotenv.config();

const PORT = process.env.PORT;
var server;

/**
 * Opens a URL in the default web browser according to the operating system.
 * - macOS: Uses the `open` command
 * - Windows: Uses the `start` command
 * - Others: Uses the `xdg-open` command
 *
 * @param {string} url - The URL to be opened in the default web browser.
 */
const openInBrowser = (url) => {
	switch (process.platform) {
		case "darwin":
			exec(`open ${url}`);
			break;
		case "win32":
			exec(`start ${url}`);
			break;
		default:
			exec(`xdg-open ${url}`);
	}
};

/**
 * Authenticates the user with Google Drive using OAuth 2.0.
 *
 * @async
 * @returns {Promise<object>} A promise that resolves with the authorized oAuth2Client object.
 * @throws Will reject the promise with an error message if authentication fails.
 */
async function google_drive_auth() {
	return new Promise(async (resolve, reject) => {
		const credentials = {
			installed: {
				client_id: process.env.CLIENT_ID,
				project_id: process.env.PROJECT_ID,
				auth_uri: process.env.AUTH_URI,
				token_uri: process.env.TOKEN_URI,
				auth_provider_x509_cert_url: process.env.AUTH_PROVIDER,
				client_secret: process.env.CLIENT_SECRET,
				redirect_uris: [process.env.REDIRECT_URI],
			},
		};

		try {
			const oAuth2Client = await authorize(credentials);
			resolve(oAuth2Client);
		} catch (error) {
			reject(`Error authorizing oAuth2Client ${error}`);
		}
	});
}

/**
 * Authorizes the user using OAuth 2.0 with the provided credentials.
 * If a token is already available, it uses that. Otherwise, it starts a server
 * and opens the browser for the user to complete the authentication flow.
 *
 * @async
 * @param {object} credentials - Contains client_id, client_secret, and redirect_uris.
 * @returns {Promise<object>} A promise that resolves with the initialized OAuth2 client.
 * @throws Will reject the promise if an error occurs during the authorization process.
 */
async function authorize(credentials) {
	const { client_secret, client_id, redirect_uris } = credentials.installed;
	const oAuth2Client = new OAuth2(client_id, client_secret, redirect_uris[0]);

	return new Promise((resolve, reject) => {
		fs.readFile(path.join("google_drive_API", "token.json"), async (err, token) => {
			if (err) {
				server = app.listen(PORT, () => {
					console.log(`Server is running on port ${PORT}`);
					openInBrowser("http://localhost:3000/auth");
					console.log("http://localhost:3000/auth opened in browser - please complete authentication flow.");
				});

				await getAccessToken(oAuth2Client).then(resolve).catch(reject);
			} else {
				oAuth2Client.setCredentials(JSON.parse(token));
				resolve(oAuth2Client);
			}
		});
	});
}

/**
 * Initiates the OAuth 2.0 access token retrieval process.
 * Opens a local server to handle OAuth 2.0 redirect and callback.
 * The token is stored in a local file for future use.
 *
 * @param {object} oAuth2Client - Initialized OAuth2 client.
 * @returns {Promise<object>} A promise that resolves with the OAuth2 client equipped with the new token.
 * @throws Will reject the promise if there's an error in retrieving or storing the token.
 */
function getAccessToken(oAuth2Client) {
	return new Promise((resolve, reject) => {
		app.get("/auth", (req, res) => {
			const authUrl = oAuth2Client.generateAuthUrl({
				access_type: "offline",
				scope: ["https://www.googleapis.com/auth/drive.readonly"],
			});
			res.redirect(authUrl);
		});

		app.get("/oauth2callback", (req, res) => {
			const code = req.query.code;
			oAuth2Client.getToken(code, (err, token) => {
				if (err) {
					server.close();
					return reject(`Error retrieving access token: ${err}`);
				}

				oAuth2Client.setCredentials(token);
				fs.writeFile(path.join("google_drive_API", "token.json"), JSON.stringify(token), (err) => {
					if (err) {
						server.close();
						return reject(`Failed to write token to file: ${err}`);
					}

					console.log("Token stored to", "token.json");
					res.send("Authentication successful! You can close this tab.");
					server.close();
					console.log("Local server closed.");
					resolve(oAuth2Client);
				});
			});
		});
	});
}

module.exports = google_drive_auth;
