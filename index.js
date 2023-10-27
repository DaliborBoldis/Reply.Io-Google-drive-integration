const drive_functions = require("./google_drive_API/functions");
const sql = require("./sql/scripts");
const google_drive_auth = require("./google_drive_API/auth");
const PushToReplyIo = require("./replyio.js");

const dotenv = require("dotenv");

dotenv.config();

const SOTS_folderId = process.env.SOTS_FOLDERID;
const apiKey = process.env.API_REPLYIO;
const emailAccount = process.env.EMAIL_ACCOUNT_REPLYIO;

/**
 * Main function to process Google Drive folders and their CSV files.
 *
 * @async
 * @returns {Promise<void>} No return value. Logs the completion or any errors.
 * @throws Logs and re-throws any errors that occur during the process.
 */
async function main() {
	try {
		const oAuth2Client = await google_drive_auth();

		const functions = new drive_functions(oAuth2Client);
		const sql_query = new sql();

		const mainFolders = await functions.drive_listFolders(SOTS_folderId);

		const chk_folders = await sql_query.sql_checkFolders(mainFolders);

		for (const folder of chk_folders) {
			try {
				if (!folder.processed) await processCSVs(functions, sql_query, folder);

				await sql_query.sql_insertFolder(folder.id, folder.name);
			} catch (error) {
				console.log(`Failed to process folder. Error: ${error}`);
			}
		}

		console.log("Done processing google drive folders and files.");
	} catch (error) {
		console.error("An error occurred:", error);
	}
}

/**
 * Processes CSV files within a Google Drive folder and pushes them to a Reply.io campaign.
 *
 * @async
 * @param {Object} functions - Instance of utility functions for Google Drive and CSV manipulation.
 * @param {Object} sql_query - Instance of SQL utility functions.
 * @param {Object} folder - Folder object containing id and name.
 * @returns {Promise<Error|null>} Returns null if successful, or error message if failed.
 * @throws Returns an error message if any of the internal operations fail.
 *
 * The function performs the following steps:
 * 1. Lists all the CSV files within the specified folder.
 * 2. Iterates over each file and checks if it has been processed.
 * 3. If not processed:
 *    - Downloads the CSV and filters necessary columns.
 *    - Creates or identifies a Reply.io campaign.
 *    - Pushes unique emails to the Reply.io campaign.
 * 4. Records the processed file in the database.
 */
async function processCSVs(functions, sql_query, folder) {
	try {
		const csv_files = await functions.drive_listCSVFiles(folder.id);

		// For each file in folder
		for (const file of csv_files) {
			try {
				// Check if file has already been processed
				const isCSVProcessed = await sql_query.sql_checkFileExists(folder.id, file.id);

				if (!isCSVProcessed) {
					const result = await functions.drive_downloadCsvAndFilterColumns(file.id, file.name);

					const campaignName = `${folder.name}_${file.name}`;

					const replyio = new PushToReplyIo(apiKey);

					// Check if campaign exists - new file new campaign
					const campaignResult = await replyio.CheckIfCampaignExists(campaignName);

					let campaignId;

					if (campaignResult === false) {
						const campaignData = {
							name: campaignName,
							emailAccount: emailAccount,
							settings: {
								emailsCountPerDay: 500,
								daysToFinishProspect: 7,
								EmailSendingDelaySeconds: 60,
								DailyThrottling: 300,
								disableOpensTracking: false,
								RepliesHandlingType: "Mark person as finished",
								enableLinksTracking: true,
							},
							steps: [
								{
									number: "1",
									InMinutesCount: "25",
									templates: [
										{
											emailTemplateId: 197744,
											CcList: "{{Secondary_Email}}",
										},
									],
								},
								{
									number: "2",
									InMinutesCount: "25",
									templates: [
										{
											emailTemplateId: 197745,
											CcList: "{{Secondary_Email}}",
										},
									],
								},
								{
									number: "3",
									InMinutesCount: "25",
									templates: [
										{
											emailTemplateId: 197746,
											CcList: "{{Secondary_Email}}",
										},
									],
								},
							],
						};

						try {
							console.log("Creating new campaign...");
							campaignId = await replyio.CreateNewCampaign(campaignData);
						} catch (error) {
							console.log(`Failed to create a new campaign: ${error}`);
							throw new Error(`Failed to create a new campaign: ${error}`);
						}
					} else if (typeof campaignResult === "object" && campaignResult.id) {
						console.log(`Campaign already exists: ${campaignResult.id}`);
						campaignId = campaignResult.id;
					} else if (typeof campaignResult === "string") {
						throw new Error(`Failed due to: ${campaignResult}`);
					}

					if (result.processed) await pushToReplyIo(replyio, functions, file.name, campaignId);

					// Add folder id and file id to database
					await sql_query.sql_insertProcessedFile(folder.id, file.id);
				}
			} catch (error) {
				console.log(`Failed to process file with ID ${file.id} in folder with ID ${folder.id}. Error message: ${error}`);
			}
		}
	} catch (error) {
		return error;
	}
}

/**
 * Pushes unique contacts from a CSV file to a Reply.io campaign.
 *
 * @async
 * @param {Object} replyio - The Reply.io service instance.
 * @param {Object} functions - Instance of utility functions to process CSV files.
 * @param {string} fileName - Name of the CSV file containing contacts.
 * @param {string} campaignId - Reply.io campaign identifier.
 * @returns {Promise<string|null>} Returns null if successful, or error message if failed.
 * @throws Returns a string indicating the reason for failure.
 *
 * The function does the following:
 * 1. Filters unique emails from the specified CSV file.
 * 2. Pushes these unique contacts to the specified Reply.io campaign.
 */
async function pushToReplyIo(replyio, functions, fileName, campaignId) {
	try {
		const uniqueRows = await functions.filterUniqueEmailsFromCSV(fileName);

		await replyio.pushContacts(uniqueRows, campaignId);
	} catch (error) {
		return `Failed to push contacts to replyio: ${error}`;
	}
}

main();
