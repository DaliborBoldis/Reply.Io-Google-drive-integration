const { google } = require("googleapis");
const fs = require("fs");
const Papa = require("papaparse");
const mysql = require("../sql/mysql");
const Queue = require("better-queue");

class google_drive_functions {
	constructor(auth) {
		this.auth = auth;
		this.drive = google.drive({ version: "v3", auth });
	}

	/**
	 * Asynchronously lists all subfolders within a given Google Drive folder.
	 *
	 * @async
	 * @param {string} folderId - The ID of the Google Drive folder to list subfolders of.
	 * @returns {Promise<Array<object>>} A promise that resolves with an array of folder objects, each containing a name and an ID.
	 * @throws Will reject the promise with an error message if the API call fails.
	 */
	async drive_listFolders(folderId) {
		return new Promise((resolve, reject) => {
			this.drive.files.list(
				{
					q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
					fields: "files(id, name)",
				},
				(err, res) => {
					if (err) {
						reject(`API error while getting list of folders: ${err}`);
						return;
					}
					const folders = res.data.files;
					if (folders.length) {
						const folderList = folders.map((folder) => ({
							name: folder.name,
							id: folder.id,
						}));
						resolve(folderList);
					} else {
						resolve([]);
					}
				}
			);
		});
	}

	/**
	 * Asynchronously lists all CSV files within a given Google Drive folder.
	 *
	 * @async
	 * @param {string} folderId - The ID of the Google Drive folder to list CSV files of.
	 * @returns {Promise<Array<object>>} A promise that resolves with an array of file objects, each containing a name and an ID.
	 * @throws Will reject the promise with an error message if the API call fails or no CSV files are found.
	 */
	async drive_listCSVFiles(folderId) {
		return new Promise((resolve, reject) => {
			this.drive.files.list(
				{
					q: `'${folderId}' in parents and mimeType='text/csv' and trashed=false`,
					fields: "files(id, name)",
				},
				(err, res) => {
					if (err) {
						reject(`API error while getting list of csv files: ${err}`);
						return;
					}
					const files = res.data.files;
					if (files.length) {
						resolve(files.map((file) => ({ name: file.name, id: file.id })));
					} else {
						reject(`No CSV files found in folder with ID ${folderId}.`);
						return;
					}
				}
			);
		});
	}

	/**
	 * Asynchronously downloads a CSV file from Google Drive by its ID and filters it based on specific columns and cities.
	 *
	 * @async
	 * @param {string} fileId - The ID of the Google Drive CSV file to download.
	 * @param {string} fileName - The name of the Google Drive CSV file to download.
	 * @returns {Promise<object>} A promise that resolves with an object containing a boolean 'processed' and the local 'filePath' where the filtered CSV is stored.
	 * @throws Will reject the promise with an error message if an error occurs in any part of the process.
	 */
	async drive_downloadCsvAndFilterColumns(fileId, fileName) {
		return new Promise(async (resolve, reject) => {
			try {
				const res = await this.drive.files.get({ fileId, alt: "media" }, { responseType: "text" });
				const data = res.data;
				const cities = [
					"Bethel",
					"Black Rock",
					"Bridgeport",
					"Cos Cob",
					"Danbury",
					"Darien",
					"Fairfield",
					"Georgetown",
					"Greenwich",
					"New Canaan",
					"Norwalk",
					"Redding",
					"Ridgefield",
					"Rowayton",
					"Sandy Hook",
					"Southport",
					"Stamford",
					"Stamford North",
					"Weston",
					"Westport",
					"Wilton",
				].map((city) => city.toLowerCase());

				const columnsToKeep = [
					"name",
					"business_type",
					"status",
					"billingstreet",
					"billingcity",
					"billingcountry",
					"billingpostalcode",
					"billingstate",
					"business_email_address",
					"mailing_address",
					"woman_owned_organization",
					"category_survey_email_address",
				];

				const parsedData = Papa.parse(data, { header: true });
				const filteredData = parsedData.data
					.filter((row) => {
						if (row.hasOwnProperty("billingcity") && cities.includes(row["billingcity"].toLowerCase())) return true;

						return false;
					})
					.map((row) => {
						const filteredRow = {};
						columnsToKeep.forEach((column) => {
							if (row.hasOwnProperty(column)) filteredRow[column] = row[column];
						});
						return filteredRow;
					});

				const csv = Papa.unparse(filteredData);

				const csvPath = `csv_storage/filtered_${fileName}`;
				fs.writeFileSync(csvPath, csv);
				console.log(`Saved ${csvPath}`);
				resolve({ processed: true, filePath: csvPath });
			} catch (error) {
				reject(`An error occurred while downloading and filtering csv file: ${error}`);
			}
		});
	}

	async filterUniqueEmailsFromCSV(fileName) {
		return new Promise(async (resolve, reject) => {
			try {
				console.log("Processing csv file...");

				const fileContent = fs.readFileSync(`csv_storage/filtered_${fileName}`, "utf8");
				const parsedData = Papa.parse(fileContent, { header: true });
				const uniqueRows = [];

				let processedCount = 0; // Counter variable

				const emailCheckQueue = new Queue(
					async (row, cb) => {
						const businessEmail = row["business_email_address"];
						const categoryEmail = row["category_survey_email_address"];

						// Initialize an array with default values for each email check in each table
						const results = { zoho: [true, true], sots: [true, true] };

						try {
							const checksToPerform = [];

							// Checking for predefined strings before entering the Promise-based logic
							// This is to ensure we filter emails with specific strings which are not direct business email
							const predefinedStrings = [
								"ctsecstate",
								"efile",
								"generalhelpct",
								"menacorpservice",
								"rasi.com",
								"taxcenterct",
								"lissette_trrs",
								"agenciadxr",
								"kellysouzadmv",
								"taxdmv",
								"durangoagency.com",
								"zenbusiness.com",
								"musillilaw.com",
								"filing",
								".gov",
							];

							if (predefinedStrings.some((str) => businessEmail.includes(str))) businessEmail = "";

							if (predefinedStrings.some((str) => categoryEmail.includes(str))) categoryEmail = "";

							if (businessEmail) {
								const checkInZohoForBusinessEmail = new Promise((resolve, reject) => {
									mysql.query(
										"SELECT COUNT(*) AS count FROM zoho_contacts WHERE Email = ? OR Secondary_Email = ?",
										[businessEmail, businessEmail],
										(err, result) => {
											if (err) return reject(err);
											results.zoho[0] = result && result[0] ? result[0].count > 0 : false;
											resolve();
										}
									);
								});

								const checkInSotsForBusinessEmail = new Promise((resolve, reject) => {
									mysql.query(
										"SELECT COUNT(*) AS count FROM sots_contacts WHERE business_email = ? OR category_survey_email_address = ?",
										[businessEmail, businessEmail],
										(err, result) => {
											if (err) return reject(err);
											results.sots[0] = result && result[0] ? result[0].count > 0 : false;
											resolve();
										}
									);
								});

								checksToPerform.push(checkInZohoForBusinessEmail, checkInSotsForBusinessEmail);
							} else {
								results.zoho[0] = true;
								results.sots[0] = true;
							}

							if (categoryEmail) {
								const checkInZohoForCategoryEmail = new Promise((resolve, reject) => {
									mysql.query(
										"SELECT COUNT(*) AS count FROM zoho_contacts WHERE Email = ? OR Secondary_Email = ?",
										[categoryEmail, categoryEmail],
										(err, result) => {
											if (err) return reject(err);
											results.zoho[1] = result && result[0] ? result[0].count > 0 : false;
											resolve();
										}
									);
								});

								const checkInSotsForCategoryEmail = new Promise((resolve, reject) => {
									mysql.query(
										"SELECT COUNT(*) AS count FROM sots_contacts WHERE business_email = ? OR category_survey_email_address = ?",
										[categoryEmail, categoryEmail],
										(err, result) => {
											if (err) return reject(err);
											results.sots[1] = result && result[0] ? result[0].count > 0 : false;
											resolve();
										}
									);
								});

								checksToPerform.push(checkInZohoForCategoryEmail, checkInSotsForCategoryEmail);
							} else {
								results.zoho[1] = true;
								results.sots[1] = true;
							}

							await Promise.all(checksToPerform);

							row.email_exists_in_db = results.zoho[0] || results.sots[0];
							row.secondary_email_exists_in_db = results.zoho[1] || results.sots[1];

							// If not both true push to uniqueRows
							if (!(row.email_exists_in_db && row.secondary_email_exists_in_db)) uniqueRows.push(row);

							processedCount++;
							if (processedCount % 50 === 0) {
								const percentageDone = (processedCount / parsedData.data.length) * 100;
								console.log(`Processing... ${percentageDone.toFixed(2)}%`);
							}

							cb();
						} catch (err) {
							cb(err);
						}
					},
					{ concurrent: 50 }
				);

				parsedData.data.forEach((row) => {
					emailCheckQueue.push(row);
				});

				emailCheckQueue.on("drain", () => {
					console.log(`Done: 100%`);
					resolve(uniqueRows);
				});
			} catch (error) {
				reject(`An error occurred while filtering unique emails from csv file: ${error}`);
			}
		});
	}

	async t_drive_downloadCsvAndFilterColumns(fileId, fileName) {
		return new Promise(async (resolve, reject) => {
			try {
				const res = await this.drive.files.get({ fileId, alt: "media" }, { responseType: "text" });
				const data = res.data;
				const cities = [
					"Bethel",
					"Bridgeport",
					"Cos Cob",
					"Danbury",
					"Darien",
					"Fairfield",
					"Greenwich",
					"New Canaan",
					"Norwalk",
					"Ridgefield",
					"Stamford",
					"Stamford North",
					"Westport",
				].map((city) => city.toLowerCase());

				const columnsToKeep = [
					"name",
					"business_type",
					"status",
					"billingstreet",
					"billingcity",
					"billingcountry",
					"billingpostalcode",
					"billingstate",
					"business_email_address",
					"mailing_address",
					"category_survey_email_address",
				];

				const parsedData = Papa.parse(data, { header: true });
				const filteredData = parsedData.data
					.filter((row) => {
						if (row.hasOwnProperty("billingcity") && cities.includes(row["billingcity"].toLowerCase())) return true;

						return false;
					})
					.map((row) => {
						const filteredRow = {};
						columnsToKeep.forEach((column) => {
							if (row.hasOwnProperty(column)) filteredRow[column] = row[column];
						});
						return filteredRow;
					});

				const csv = Papa.unparse(filteredData);

				const csvPath = `combined/filtered_${fileName}`;
				fs.writeFileSync(csvPath, csv);
				console.log(`Saved ${csvPath}`);
				resolve({ processed: true, filePath: csvPath });
			} catch (error) {
				reject(`An error occurred while downloading and filtering csv file: ${error}`);
			}
		});
	}
}

module.exports = google_drive_functions;
