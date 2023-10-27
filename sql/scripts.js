const mysql = require("./mysql");

class sql_query {
	/**
	 * Asynchronously checks the existence of folders in a MySQL database using their IDs and names.
	 * Loops through an array of folder objects and performs SQL queries to check each one.
	 *
	 * @async
	 * @param {Array<object>} folders - An array of folder objects, each containing 'id' and 'name' properties.
	 * @returns {Promise<Array<object>>} A promise that resolves with an array of objects, each containing folder 'id', 'name', and a 'processed' boolean to indicate existence in the database.
	 * @throws Will reject the promise with an error message if any error occurs during the process.
	 */
	async sql_checkFolders(folders) {
		return new Promise(async (resolve, reject) => {
			const query = "SELECT COUNT(*) AS count FROM sots_main_folders WHERE folder_id = ? AND folder_name = ?";
			const results = [];

			for (const { id, name } of folders) {
				try {
					const queryResult = await new Promise((resolve, reject) => {
						mysql.query(query, [id, name], function (err, result) {
							err ? reject(err) : resolve(result);
						});
					});

					const processed = queryResult[0].count > 0;

					results.push({ id, name, processed });
				} catch (err) {
					reject(`Error checking folders: ${err}`);
					return; // Terminate the loop
				}
			}

			resolve(results);
		});
	}

	/**
	 * Asynchronously checks if a file exists in a specific folder within a MySQL database.
	 * Utilizes a SQL query to check the existence based on folder and file IDs.
	 *
	 * @async
	 * @param {string} folderId - The ID of the folder in which to check for the file.
	 * @param {string} fileId - The ID of the file to check for.
	 * @returns {Promise<boolean>} A promise that resolves with a boolean indicating if the file exists.
	 */
	async sql_checkFileExists(folderId, fileId) {
		const query = "SELECT COUNT(*) AS count FROM sots_processed_files WHERE folder_id = ? AND file_id = ?";
		return new Promise((resolve, reject) => {
			mysql.query(query, [folderId, fileId], function (err, result) {
				if (err) {
					console.log(`Error checking file existence for folderId: ${folderId}, fileId: ${fileId} - ${err}`);
					return reject(err);
				}

				resolve(result[0].count > 0);
			});
		});
	}

	/**
	 * Inserts a new folder record into the sots_main_folders table.
	 *
	 * @async
	 * @param {string} folder_id - The ID of the folder to be inserted.
	 * @param {string} folder_name - The name of the folder to be inserted.
	 * @returns {Promise} A Promise that resolves with the result of the MySQL query or rejects with an error.
	 * @throws Will throw an error if the MySQL query fails.
	 */
	async sql_insertFolder(folder_id, folder_name) {
		try {
			const query = "INSERT INTO sots_main_folders (folder_id, folder_name) VALUES (?, ?)";
			const params = [folder_id, folder_name];

			return new Promise((resolve, reject) => {
				mysql.query(query, params, function (err, result) {
					err ? reject(err) : resolve(result);
				});
			});
		} catch (error) {
			console.error(`Error while inserting folder: ${folder_name} with ID: ${folder_id}. Error: ${error}`);
			throw error;
		}
	}

	/**
	 * Inserts a new processed file record into the sots_processed_files table.
	 *
	 * @async
	 * @param {string} folder_id - The ID of the folder containing the file.
	 * @param {string} file_id - The ID of the file to be inserted.
	 * @returns {Promise} A Promise that resolves with the result of the MySQL query or rejects with an error.
	 * @throws Will throw an error if the MySQL query fails.
	 */
	async sql_insertProcessedFile(folder_id, file_id) {
		try {
			const query = "INSERT INTO sots_processed_files (folder_id, file_id) VALUES (?, ?)";
			const params = [folder_id, file_id];

			return new Promise((resolve, reject) => {
				mysql.query(query, params, function (err, result) {
					err ? reject(err) : resolve(result);
				});
			});
		} catch (error) {
			console.error(`Error while inserting file with ID: ${file_id} in folder ID: ${folder_id}. Error: ${error}`);
			throw error;
		}
	}

	/**
	 * Inserts a new contact into the sots_contacts table.
	 *
	 * @async
	 * @param {string} name - The name of the contact.
	 * @param {string} business_email_address - The business email address of the contact.
	 * @param {string} mailing_address - The mailing address of the contact.
	 * @param {string} category_survey_email_address - The category survey email address of the contact.
	 * @returns {Promise} Resolves upon successful insertion, rejects on error.
	 * @throws Logs and throws an error if the MySQL query or insertion fails.
	 */
	async insertContact(name, business_email_address, mailing_address, category_survey_email_address) {
		try {
			const query =
				"INSERT INTO sots_contacts (name, business_email, mailing_address, category_survey_email_address) VALUES (?, ?, ?, ?)";
			const params = [name, business_email_address, mailing_address, category_survey_email_address];

			return new Promise((resolve, reject) => {
				mysql.query(query, params, function (err) {
					err ? reject(err) : resolve();
				});
			});
		} catch (error) {
			console.error(`Error while inserting contact: ${name} into database: ${error}`);
			throw error;
		}
	}
}

module.exports = sql_query;
