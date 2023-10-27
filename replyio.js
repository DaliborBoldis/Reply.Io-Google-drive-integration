const { cloudfunctions_v2alpha } = require("googleapis");
const Actions = require("./replyio_api/actions");
const Campaigns = require("./replyio_api/campaigns");
const sql = require("./sql/scripts");

const Queue = require("better-queue");

class PushToReplyIo {
	constructor(apiKey) {
		this.actions = new Actions(apiKey);
		this.campaigns = new Campaigns(apiKey);
	}

	/**
	 * Cleans a company name by removing common legal extensions and formats.
	 *
	 * @param {string} name - The original company name to clean.
	 * @returns {string} Returns the cleaned company name.
	 */
	cleanCompanyName(name) {
		let patterns = [
			", LLC",
			" LLC",
			" Limited Liability Company",
			" L.L.C.",
			", Inc.",
			" Inc",
			", INC",
			" Inc.",
			", PLLC",
			" PLLC",
			", CORP",
			" Ltd.",
			" Liability Co.",
			" INCORPORATED",
			" Corporation",
			" Limited Liability Partnership",
			" P.L.L.C",
		];
		let cleanedName = name;
		for (const pattern of patterns) {
			cleanedName = cleanedName.replace(new RegExp(pattern, "gi"), "");
		}
		cleanedName = cleanedName.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase());
		return cleanedName.replace(/[.,\s]+$/, ""); // Remove trailing comma, dot, or space
	}

	async pushContacts(uniqueRows, campaignId) {
		return new Promise(async (resolve, reject) => {
			let pushedCount = 0;
			let remainingCount = uniqueRows.length;
			const maxRetries = 3; // Set your maximum retries here

			const apiCallQueue = new Queue(
				(contactData, cb) => {
					const makeAPICall = async (retriesLeft) => {
						this.actions
							.createAndPushContactToCampaign(contactData)
							.then(() => {
								remainingCount--;

								const mailingAddress = contactData.customFields.find((field) => field.key === "Mailing address")?.value;
								try {
									const sql_query = new sql();

									sql_query.insertContact(
										contactData.company,
										contactData.email,
										mailingAddress,
										contactData.customFields.find((field) => field.key === "Secondary Email")?.value
									);
								} catch (error) {
									console.error(`Failed to insert contact to database: ${error}`);
								}
								console.log(
									`Contact with email: ${contactData.email} created and pushed to campaign ID ${campaignId}. Remaining: ${remainingCount}`
								);

								setTimeout(() => {
									cb(null);
								}, 11000); // 11 seconds delay
							})
							.catch(async (error) => {
								if (retriesLeft > 0) {
									if (error.includes("Contact is already in this sequence")) {
										retriesLeft = 0;

										console.log(`Error: ${error}`);

										cb(error);
									} else {
										console.log(`Retrying for email: ${contactData.email}. Retries left: ${retriesLeft}`);
										await new Promise((resolve) => setTimeout(resolve, 11000));

										makeAPICall(retriesLeft - 1);
									}
								} else {
									console.error(`Failed after ${maxRetries} retries. Error: ${error}`);
									cb(error);
								}
							});
					};
					makeAPICall(maxRetries);
				},
				{ concurrent: 1 }
			);

			for (const row of uniqueRows) {
				let {
					name,
					business_type,
					status,
					billingstreet,
					billingcity,
					billingcountry,
					billingpostalcode,
					billingstate,
					business_email_address,
					mailing_address,
					woman_owned_organization,
					category_survey_email_address,
					email_exists_in_db,
					secondary_email_exists_in_db,
				} = row;

				pushedCount++;

				if (business_email_address == category_survey_email_address) category_survey_email_address = "";

				if (secondary_email_exists_in_db) category_survey_email_address = "";

				if (email_exists_in_db) {
					if (!secondary_email_exists_in_db) {
						business_email_address = category_survey_email_address;
						category_survey_email_address = "";
					}
				}

				const contactData = {
					campaignId: campaignId,
					email: business_email_address,
					firstName: "null",
					lastName: "",
					company: name,
					city: billingcity,
					state: billingstate,
					country: billingcountry,
					timeZoneId: "US Eastern Standard Time",
					title: "",
					notes: "",
					phone: "",
					linkedInProfile: "",
					customFields: [
						{
							key: "Secondary Email",
							value: category_survey_email_address,
						},
						{ key: "Dear", value: "Hello" },
						{
							key: "Example Article",
							value:
								"https://news.hamlethub.com/ridgefield/places/75667-why-small-businesses-matter-private-educational-services",
						},
						{ key: "Lead source", value: "https://drive.google.com/drive/folders/1IdDroORBVaKhbD-p1pPJphCoZvikYrKJ" },
						{ key: "Mailing address", value: mailing_address },
						{ key: "Shortened Company name", value: this.cleanCompanyName(name) },
						{ key: "Sponsor", value: "Fairfield County Bank" },
					],
				};

				apiCallQueue.push(contactData);
			}

			apiCallQueue
				.on("drain", () => {
					console.log(`All contacts pushed to replyio. Total pushed: ${pushedCount}`);
					resolve();
				})
				.on("error", (error) => {
					console.error(`Failed after ${maxRetries} retries. Error: ${error}`);
					reject(error);
				});
		});
	}

	async CheckIfCampaignExists(campaignName) {
		try {
			const data = await this.campaigns.getCampaignDetailsByName(campaignName);

			return data;
		} catch (error) {
			if (error.toString().includes("Campaign not found")) return false;

			throw `An error occurred while checking if campaign exists: ${error}`;
		}
	}

	async CreateNewCampaign(campaignData) {
		return new Promise((resolve, reject) => {
			this.campaigns
				.createCampaignTemplateStepText(campaignData)
				.then((data) => {
					console.log(`Campaign ${campaignData.name} created:`, data);
					resolve(data.id);
				})
				.catch((error) => {
					console.error(error);
					reject(error);
				});
		});
	}
}

module.exports = PushToReplyIo;
