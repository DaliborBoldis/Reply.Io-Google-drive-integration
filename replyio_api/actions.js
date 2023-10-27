const ReplyAuth = require("./api_auth");

class Actions {
	constructor(apiKey) {
		this.auth = new ReplyAuth(apiKey);
	}

	async pushContactToCampaign(campaignId, email) {
		try {
			const data = { campaignId, email };

			return await this.auth.post(`https://api.reply.io/v1/actions/pushtocampaign`, JSON.stringify(data), true);
		} catch (error) {
			throw `An error occurred while pushing ${email} to campaign with ID ${campaignId}: ${await this.auth.handleApiError(
				error
			)}`;
		}
	}

	async createAndPushContactToCampaign(data) {
		try {
			return await this.auth.post(`https://api.reply.io/v1/actions/addandpushtocampaign`, JSON.stringify(data), true);
		} catch (error) {
			throw `An error occurred while creating and pushing contact to campaign: ${await this.auth.handleApiError(error)}`;
		}
	}

	async forcePushContactToCampaign(campaignId, email) {
		try {
			const data = { campaignId, email, forcePush: true };

			return await this.auth.post(`https://api.reply.io/v1/actions/pushtocampaign`, JSON.stringify(data), true);
		} catch (error) {
			throw `An error occurred while force-pushing ${email} to campaign with ID ${campaignId}: ${await this.auth.handleApiError(
				error
			)}`;
		}
	}

	async removeContactFromOneCampaign(campaignId, email) {
		try {
			const data = { campaignId, email };

			return await this.auth.post(`https://api.reply.io/v1/actions/removepersonfromcampaignbyid`, JSON.stringify(data), true);
		} catch (error) {
			throw `An error occurred while removing ${email} from campaign with ID ${campaignId}: ${await this.auth.handleApiError(
				error
			)}`;
		}
	}

	async removeContactFromAllCampaigns(email) {
		try {
			const data = { email };

			return await this.auth.post(`https://api.reply.io/v1/actions/removepersonfromallcampaigns`, JSON.stringify(data), true);
		} catch (error) {
			throw `An error occurred while removing ${email} from all campaigns: ${await this.auth.handleApiError(error)}`;
		}
	}

	async markContactAsRepliedByEmail(email) {
		try {
			const data = { email };

			return await this.auth.post(`https://api.reply.io/v1/actions/markasreplied`, JSON.stringify(data), true);
		} catch (error) {
			throw `An error occurred while marking ${email} as 'Replied': ${await this.auth.handleApiError(error)}`;
		}
	}

	async markContactAsRepliedByDomain(domain) {
		try {
			const data = { domain };

			return await this.auth.post(`https://api.reply.io/v1/actions/markasreplied`, JSON.stringify(data), true);
		} catch (error) {
			throw `An error occurred while marking ${domain} as 'Replied': ${await this.auth.handleApiError(error)}`;
		}
	}

	async markContactAsFinishedByEmail(email) {
		try {
			const data = { email };

			return await this.auth.post(`https://api.reply.io/v1/actions/markasfinished`, JSON.stringify(data), true);
		} catch (error) {
			throw `An error occurred while marking ${email} as 'Finished': ${await this.auth.handleApiError(error)}`;
		}
	}

	async markContactAsFinishedByDomain(domain) {
		try {
			const data = { domain };

			return await this.auth.post(`https://api.reply.io/v1/actions/markasfinished`, JSON.stringify(data), true);
		} catch (error) {
			throw `An error occurred while marking ${domain} as 'Finished': ${await this.auth.handleApiError(error)}`;
		}
	}

	async unmarkContactAsOutOfOffice(email) {
		try {
			const data = { email };

			return await this.auth.post(`https://api.reply.io/v1/actions/unmark-as-out-of-office`, JSON.stringify(data), true);
		} catch (error) {
			throw `An error occurred while unmarking ${email} as 'Out of Office': ${await this.auth.handleApiError(error)}`;
		}
	}
}

module.exports = Actions;
