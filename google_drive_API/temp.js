const { google } = require("googleapis");
const fs = require("fs");
const Papa = require("papaparse");
const mysql = require("../sql/mysql");
const Queue = require("better-queue");
const google_drive_auth = require("../google_drive_API/auth");
const drive_functions = require("../google_drive_API/functions");

const dotenv = require("dotenv");

dotenv.config();

async function main() {
	const SOTS_folderId = process.env.SOTS_FOLDERID;

	const oAuth2Client = await google_drive_auth();

	const functions = new drive_functions(oAuth2Client);

	const mainFolders = await functions.drive_listFolders(SOTS_folderId);

	console.log(mainFolders);

	// const chk_folders = await sql_query.sql_checkFolders(mainFolders);

	for (const folder of mainFolders) {
		try {
			if (folder.name.includes("2023")) await processCSVs(functions, folder);

			//await sql_query.sql_insertFolder(folder.id, folder.name);
		} catch (error) {
			console.log(`Failed to process folder. Error: ${error}`);
		}
	}
}

async function processCSVs(functions, folder) {
	try {
		const csv_files = await functions.drive_listCSVFiles(folder.id);

		// For each file in folder
		for (const file of csv_files) {
			if (file.name.includes("2023-")) console.log(file);

			const result = await functions.t_drive_downloadCsvAndFilterColumns(file.id, file.name);

			if (result.processed) console.log(`File ${file.name} processed`);
			// try {
			// 	// Check if file has already been processed
			// 	const isCSVProcessed = await sql_query.sql_checkFileExists(folder.id, file.id);
			// 	if (!isCSVProcessed) {
			// 		const result = await functions.drive_downloadCsvAndFilterColumns(file.id, file.name);
			// 		const campaignName = `${folder.name}_${file.name}`;
			// 		const replyio = new PushToReplyIo(apiKey);
			// 		// Check if campaign exists - new file new campaign
			// 		const campaignResult = await replyio.CheckIfCampaignExists(campaignName);
			// 		let campaignId;
			// 		if (campaignResult === false) {
			// 			const campaignData = {
			// 				name: campaignName,
			// 				emailAccount: emailAccount,
			// 				settings: {
			// 					emailsCountPerDay: 500,
			// 					daysToFinishProspect: 7,
			// 					EmailSendingDelaySeconds: 60,
			// 					DailyThrottling: 300,
			// 					disableOpensTracking: false,
			// 					RepliesHandlingType: "Mark person as finished",
			// 					enableLinksTracking: true,
			// 				},
			// 				steps: [
			// 					{
			// 						number: "1",
			// 						InMinutesCount: "25",
			// 						templates: [
			// 							{
			// 								emailTemplateId: 197744,
			// 								CcList: "{{Secondary_Email}}",
			// 							},
			// 						],
			// 					},
			// 					{
			// 						number: "2",
			// 						InMinutesCount: "25",
			// 						templates: [
			// 							{
			// 								emailTemplateId: 197745,
			// 								CcList: "{{Secondary_Email}}",
			// 							},
			// 						],
			// 					},
			// 					{
			// 						number: "3",
			// 						InMinutesCount: "25",
			// 						templates: [
			// 							{
			// 								emailTemplateId: 197746,
			// 								CcList: "{{Secondary_Email}}",
			// 							},
			// 						],
			// 					},
			// 				],
			// 			};
			// 			try {
			// 				console.log("Creating new campaign...");
			// 				campaignId = await replyio.CreateNewCampaign(campaignData);
			// 			} catch (error) {
			// 				console.log(`Failed to create a new campaign: ${error}`);
			// 				throw new Error(`Failed to create a new campaign: ${error}`);
			// 			}
			// 		} else if (typeof campaignResult === "object" && campaignResult.id) {
			// 			console.log(`Campaign already exists: ${campaignResult.id}`);
			// 			campaignId = campaignResult.id;
			// 		} else if (typeof campaignResult === "string") {
			// 			throw new Error(`Failed due to: ${campaignResult}`);
			// 		}
			// 		if (result.processed) await pushToReplyIo(replyio, functions, file.name, campaignId);
			// 		// Add folder id and file id to database
			// 		await sql_query.sql_insertProcessedFile(folder.id, file.id);
			// 	}
			// } catch (error) {
			// 	console.log(`Failed to process file with ID ${file.id} in folder with ID ${folder.id}. Error message: ${error}`);
			// }
		}
	} catch (error) {
		console.log(error);
		return error;
	}
}

main();
