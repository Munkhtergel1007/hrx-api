import winston from "winston";
import async from "async";
import { check, validationResult } from "express-validator/check";
import { matchedData } from "express-validator/filter";
import auth from "../../auth";
import Employee from "../../models/Employee";
import User from "../../models/User";
import {locale} from "../../lang";
import {isValidDate} from "../../config";
let slug = require("slug");

module.exports = function (router) {
	router.get("/get/workers/archive", auth.company, function (req, res) {
		let searchQu = [{ status: "fired"}, {company: req.company._id }];
		if(isValidDate(req.body.ending_date) && isValidDate(req.body.starting_date)){
			let ending;
			ending = new Date(req.body.ending_date)
			ending.setDate(ending.getDate() +1 )
			ending.setMilliseconds(ending.getMilliseconds() - 1);
			if(req.body.dateType === 'working'){
				searchQu.push({$and: [
						{created:{$lte:new Date(isValidDate(ending))}},
						{created:{$gte:new Date(isValidDate(req.body.starting_date))}}
					]});
			} else if(req.body.dateType === 'fired'){
				searchQu.push(
					{$and: [
							{created:{$elemMatch:{$lte:new Date(isValidDate(ending))}}},
							{created:{$elemMatch:{$gte:new Date(isValidDate(req.body.starting_date))}}}
						]},
				);
			}
		}
		function getUserQuery (item){
			let userQu = [{_id: item.user}];
			if (req.query.search && req.query.search !== "") {
				let regex = new RegExp(".*" + req.query.search + ".*", "i");
				userQu = {
					$and: [
						{ _id: item.user },
						{ $or: [
								{ first_name: regex },
								{ last_name: regex },
								{ register_id: regex },
								{ phone: regex },
								{ email: regex }
							] }]
				};
			}
			return {$and:userQu};
		}
		async.parallel(
			[
				function (callback) {
					Employee.find({$and: searchQu})
						.sort({ created: -1 })
						// .skip(
						// 	parseInt(req.query.pageNum) *
						// 		parseInt(req.query.pageSize)
						// )
						// .limit(parseInt(req.query.pageSize))
						// .deepPopulate(["created_by"])
						.lean()
						.exec(function (err, result) {
							async.map(
								result,
								function (item, cb) {
									User.findOne(getUserQuery(item), {_id:1, first_name:1, last_name:1, register_id:1, phone:1, email:1 })
										.lean()
										.exec(function (errT, subUser) {
											cb(err || errT, {
												...item,
												user: subUser || []
											});
										});
								},
								function (err, ress) {
									callback(err, ress);
								}
							);
						});
				},
				function (callback) {
					Employee.count({$and: searchQu}).exec(function (err, result) {
						callback(err, result);
					});
				}
			],
			function (err, results) {
				if (err) {
					winston.error("/workers/archive", err);
					return res
						.status(200)
						.json({ success: false, msg: locale("system_err"), err });
				}
				console.log(results[0]);

				let filteredByUser = (results[0] || []).filter(r => r.user && r.user._id)
				let cutted = [];
				if(!isNaN(req.query.pageNum) && !isNaN(req.query.pageSize) && parseInt(req.query.pageNum) == req.query.pageNum && parseInt(req.query.pageSize) == req.query.pageSize){
					cutted = (filteredByUser || []).splice((parseInt(req.query.pageNum)*parseInt(req.query.pageSize)), parseInt(req.query.pageSize));
				}
				console.log(cutted);
				return res.status(200).json({
					success: true,
					employeesArchive: cutted || [],
					all: results[1] || 0
				});
			}
		);
	});
};
