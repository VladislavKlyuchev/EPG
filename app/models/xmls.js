
module.exports = function (sequelize, Sequelize) {

	var Epgs = sequelize.define('epg', {
		id: { autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
		key: { type:Sequelize.STRING},
		title: { type: Sequelize.STRING },
		description: { type: Sequelize.STRING },
		startDate: {type: Sequelize.STRING},
		endDate: {type: Sequelize.STRING}

	});
	return Epgs;

}