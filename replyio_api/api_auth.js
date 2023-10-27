const axios = require("axios");

class ReplyAuth {
	constructor(apiKey) {
		this.apiKey = apiKey;
	}

	async makeRequest(method, url, data = null, includeContentType = false) {
		const config = {
			method,
			maxBodyLength: Infinity,
			url,
			headers: {
				"X-Api-Key": this.apiKey,
			},
			data: data,
		};

		if (includeContentType) config.headers["Content-Type"] = "application/json";

		try {
			const response = await axios(config);
			return response.data;
		} catch (error) {
			throw error;
		}
	}

	async get(url, data) {
		return await this.makeRequest("get", url, data);
	}

	async post(url, data, includeContentType = false) {
		return await this.makeRequest("post", url, data, includeContentType);
	}

	async put(url, data) {
		return await this.makeRequest("put", url, data);
	}

	async delete(url, data, includeContentType = false) {
		return await this.makeRequest("delete", url, data, (includeContentType = true));
	}

	async patch(url, data, includeContentType = false) {
		return await this.makeRequest("patch", url, data, includeContentType);
	}

	async handleApiError(error) {
		if (error.response) {
			const { status, data } = error.response;

			switch (status) {
				case 400:
					return `Status code: ${status} - Wrong input parameter: ${JSON.stringify(data)}`;
				case 401:
					return `Status code: ${status} - User not found. Invalid API key.`;
				case 403:
					return `Status code: ${status} - Access denied. The API key doesn't have access to the requested resource.`;
				case 404:
					return `Status code: ${status} - The requested resource could not be found: ${JSON.stringify(data)}`;
				case 500:
					return `Status code: ${status} - Internal Server Error. Please try again later.`;
				default:
					return `Status code: ${status} - Unexpected error: ${JSON.stringify(data)}`;
			}
		} else {
			return "Status code: unknown - Unknown error occurred while making the API request.";
		}
	}
}

module.exports = ReplyAuth;
