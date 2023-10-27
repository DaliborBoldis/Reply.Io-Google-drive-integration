const ReplyAuth = require("./api_auth");

class Campaigns {
	constructor(apiKey) {
		this.auth = new ReplyAuth(apiKey);
	}

	async getCampaignDetailsByName(name) {
		try {
			const url = `https://api.reply.io/v1/campaigns?name=${encodeURIComponent(name)}`;
			return await this.auth.get(url);
		} catch (error) {
			throw `An error occurred while fetching campaign details for ${name}: ${await this.auth.handleApiError(error)}`;
		}
	}

	async getCampaignDetailsByID(id) {
		try {
			return await this.auth.get(`https://api.reply.io/v1/campaigns?id=${id}`);
		} catch (error) {
			throw `An error occurred while fetching campaign details by ID ${id}: ${await this.auth.handleApiError(error)}`;
		}
	}

	async getListOfCampaignSchedules() {
		try {
			return await this.auth.get("https://api.reply.io/v2/schedules");
		} catch (error) {
			throw `An error occurred while fetching list of campaign schedules: ${await this.auth.handleApiError(error)}`;
		}
	}

	async getListOfDefaultCampaignSchedules() {
		try {
			return await this.auth.get("https://api.reply.io/v2/schedules/default");
		} catch (error) {
			throw `An error occurred while fetching list of default campaign schedules: ${await this.auth.handleApiError(error)}`;
		}
	}

	async getListOfCampaigns() {
		try {
			return await this.auth.get("https://api.reply.io/v1/campaigns");
		} catch (error) {
			throw `An error occurred while fetching list of campaigns: ${await this.auth.handleApiError(error)}`;
		}
	}

	async getListOfContactsPerCampaign(id) {
		try {
			return await this.auth.get(`https://api.reply.io/v1/campaigns/${id}/people`);
		} catch (error) {
			throw `An error occurred while fetching list of contacts per campaign by ID ${id}: ${await this.auth.handleApiError(
				error
			)}`;
		}
	}

	async createCampaignCustomStepText(data) {
		try {
			return await this.auth.post("https://api.reply.io/v2/campaigns", JSON.stringify(data), true);
		} catch (error) {
			throw `An error occurred while creating campaign (Custom step text): ${await this.auth.handleApiError(error)}`;
		}
	}

	async createCampaignTemplateStepText(data) {
		try {
			return await this.auth.post("https://api.reply.io/v2/campaigns", JSON.stringify(data), true);
		} catch (error) {
			throw `An error occurred while creating campaign (Template step text): ${await this.auth.handleApiError(error)}`;
		}
	}

	async createCampaignMultipleStepsAndVariants(data) {
		try {
			return await this.auth.post("https://api.reply.io/v2/campaigns", JSON.stringify(data), true);
		} catch (error) {
			throw `An error occurred while creating campaign (Multiple steps and variants): ${await this.auth.handleApiError(error)}`;
		}
	}

	async createCampaignCustomSchedule(data) {
		try {
			return await this.auth.post("https://api.reply.io/v2/campaigns", JSON.stringify(data), true);
		} catch (error) {
			throw `An error occurred while creating campaign (Custom schedule): ${await this.auth.handleApiError(error)}`;
		}
	}

	async getListOfCampaignSteps(id) {
		try {
			return await this.auth.get(`https://api.reply.io/v2/campaigns/${id}/steps`);
		} catch (error) {
			throw `An error occurred while getting list of campaign steps by ID ${id}: ${await this.auth.handleApiError(error)}`;
		}
	}

	async getCampaignStepById(campaignId, stepId) {
		try {
			return await this.auth.get(`https://api.reply.io/v2/campaigns/${campaignId}/steps/${stepId}`);
		} catch (error) {
			throw `An error occurred while getting step with ID ${stepId} from campaign with ID ${campaignId}: ${handleApiError(
				error
			)}`;
		}
	}

	async addStepToCampaign(campaignId, data) {
		try {
			return await this.auth.post(`https://api.reply.io/v2/campaigns/${campaignId}/steps`, JSON.stringify(data), true);
		} catch (error) {
			throw `An error occurred while adding step to campaign with ID ${campaignId}: ${await this.auth.handleApiError(error)}`;
		}
	}

	async updateCampaignStep(campaignId, stepId, data) {
		try {
			return await this.auth.patch(`https://api.reply.io/v2/campaigns/${campaignId}/steps/${stepId}`, JSON.stringify(data), true);
		} catch (error) {
			throw `An error occurred while updating step with ID ${stepId} in campaign with ID ${campaignId}: ${await this.auth.handleApiError(
				error
			)}`;
		}
	}

	async deleteCampaignStep(campaignId, stepId) {
		try {
			return await this.auth.delete(`https://api.reply.io/v2/campaigns/${campaignId}/steps/${stepId}`, null, true);
		} catch (error) {
			throw `An error occurred while deleting step with ID ${stepId} from campaign with ID ${campaignId}: ${handleApiError(
				error
			)}`;
		}
	}

	async updateCampaignSettings(campaignId, data) {
		try {
			return await this.auth.patch(`https://api.reply.io/v2/campaigns/${campaignId}`, JSON.stringify(data), true);
		} catch (error) {
			throw `An error occurred while updating settings in campaign with ID ${campaignId}: ${await this.auth.handleApiError(
				error
			)}`;
		}
	}

	async startCampaign(campaignId) {
		try {
			return await this.auth.post(`https://api.reply.io/v2/campaigns/${campaignId}/start`);
		} catch (error) {
			throw `An error occurred while starting campaign with ID ${campaignId}: ${await this.auth.handleApiError(error)}`;
		}
	}

	async pauseCampaign(campaignId) {
		try {
			return await this.auth.post(`https://api.reply.io/v2/campaigns/${campaignId}/pause`);
		} catch (error) {
			throw `An error occurred while pausing campaign with ID ${campaignId}: ${await this.auth.handleApiError(error)}`;
		}
	}

	async archiveCampaign(campaignId) {
		try {
			return await this.auth.post(`https://api.reply.io/v2/campaigns/${campaignId}/archive`);
		} catch (error) {
			throw `An error occurred while archiving campaign with ID ${campaignId}: ${await this.auth.handleApiError(error)}`;
		}
	}

	async toggleEmailStepVariant(sequenceId, activate) {
		try {
			const data = { activate: activate ? "True" : "False" };
			return await this.auth.post(`https://api.reply.io/v2/campaigns/${sequenceId}/variants/toggle`, data);
		} catch (error) {
			throw `An error occurred while toggling the email step variant with sequenceID ${sequenceId}: ${await this.auth.handleApiError(
				error
			)}`;
		}
	}
}

module.exports = Campaigns;
