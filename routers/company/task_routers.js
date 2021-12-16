import auth from "../../auth";
import async from "async";
import {
	isId,
	isValidDate,
	winsErr,
	companyAdministrator,
	getDatesBetweenDates
} from "../../config";
import moment from "moment";
import mongoose from "mongoose";
import Employee from "../../models/Employee";
import Task from "../../models/Task";
import Subtag from "../../models/SubTag";
import Media from "../../models/Media";

import {locale} from "../../lang";

const ObjectId = mongoose.Types.ObjectId;

module.exports = function (router) {
	function BetweenDates(starting_date, ending_date, filterQu) {
		if (starting_date && ending_date) {
			const startDate = new Date(starting_date);
			startDate.setHours(0, 0, 0, 0);
			const endDate = new Date(ending_date);
			endDate.setHours(0, 0, 0, 0);
			endDate.setDate(endDate.getDate() + 1);
			endDate.setMilliseconds(endDate.getMilliseconds() - 1);
			filterQu = [
				...(filterQu || []),
				{
					$addFields: {
						searchDate: "$dates"
					}
				},
				{
					$unwind: "$searchDate"
				},
				{
					$match: {
						$expr: {
							$and: [
								{
									$gte: ["$searchDate", startDate]
								},
								{
									$lte: ["$searchDate", endDate]
								}
							]
						}
					}
				},
				{
					$group: {
						_id: "$_id",
						company: { $first: "$company" },
						list: { $first: "$list" },
						dates: { $first: "$dates" },
						description: { $first: "$description" },
						title: { $first: "$title" },
						status: { $first: "$status" },
						owner: { $first: "$owner" },
						tag: { $first: "$tag" },
						price: { $first: "$price" },
						created: { $first: "$created" },
						finished: { $first: "$finished" },
						employees: { $first: "$employees" }
					}
				}
			];
		}
		return filterQu;
	}
	const getAvatar = function (req, res, employees, callback) {
		let avatarIds = [];
		(employees || []).map((employee) =>
			(employee.user || {}).avatar
				? avatarIds.push((employee.user || {}).avatar)
				: null
		);
		Media.find({ _id: { $in: avatarIds }, status: "active" })
			.lean()
			.exec(function (err, media) {
				if (err) {
					winsErr(req, err, "Media.find - get/employee/standard");
					callback(employees);
				}
				if (media && (media || []).length > 0) {
					employees = (employees || []).map((emp) => {
						let avatar = {};
						(media || []).map((med) => {
							if (
								((emp.user || {}).avatar || "as").toString() ===
								(med._id || "").toString()
							)
								avatar = med;
						});
						return {
							...emp,
							user: {
								...emp.user,
								avatar
							}
						};
					});
					callback(employees);
				} else {
					callback(employees);
				}
			});
	};
	const GetEmployee = function (
		req,
		res,
		{ pageNum, pageSize, employee, company },
		cb
	) {
		if (companyAdministrator(req.employee)) {
			let filter = {
				status: "active",
				staticRole: { $ne: "attendanceCollector" }
			};
			if (employee) filter._id = employee;
			if (company && company !== "all") filter.company = company;
			else
				filter.company = [...(req.subsidiaries || []), req.company._id];
			async.parallel(
				{
					emps: function (cbe) {
						Employee.find(filter)
							.skip(pageNum * pageSize)
							.limit(pageSize)
							.lean()
							.deepPopulate("user")
							.exec(function (err, emps) {
								getAvatar(req, res, emps, (employees) => {
									cbe(err, employees);
								});
							});
					},
					all: function (cbe) {
						Employee.countDocuments(filter).exec(function (
							err,
							count
						) {
							cbe(err, count);
						});
					}
				},
				function (err, data) {
					cb(err, data.emps, data.all);
				}
			);
		} else {
			let formatted = req.employee;
			formatted.user = req.user;
			cb("", [formatted], 1);
		}
	};
	const GetSubtags = function (
		req,
		res,
		{ pageNum, pageSize, subtag, company },
		cb
	) {
		let filter = {
			status: "active"
		};
		if (subtag && subtag !== "all") filter._id = subtag;
		if (company && company !== "all") filter.company = company;
		else filter.company = [...(req.subsidiaries || []), req.company._id];
		async.parallel(
			{
				subtags: function (cbe) {
					Subtag.find(filter)
						.skip(pageNum * pageSize)
						.limit(pageSize)
						.lean()
						.exec(function (err, tags) {
							cbe(err, tags);
						});
				},
				all: function (cbe) {
					Subtag.countDocuments(filter).exec(function (err, count) {
						cbe(err, count);
					});
				}
			},
			function (err, data) {
				cb(err, data.subtags, data.all);
			}
		);
	};
	const getTasks = function (
		req,
		res,
		filterQu,
		extra,
		preAggregate,
		afterAggregate,
		all
	) {
		Task.aggregate([
			...filterQu,
			...(preAggregate || []),
			{
				$lookup: {
					from: "subtags",
					let: { id: "$tag" },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ["$_id", "$$id"]
										}
									]
								}
							}
						}
					],
					as: "tag"
				}
			},
			{
				$set: {
					tag: {
						$arrayElemAt: ["$tag", 0]
					}
				}
			},
			{
				$lookup: {
					from: "users",
					let: { id: "$owner.user" },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ["$_id", "$$id"]
										}
									]
								}
							}
						}
					],
					as: "owner.user"
				}
			},
			{
				$set: {
					"owner.user": {
						$arrayElemAt: ["$owner.user", 0]
					}
				}
			},
			{
				$lookup: {
					from: "media",
					let: { id: "$owner.user.avatar" },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ["$_id", "$$id"]
										}
									]
								}
							}
						}
					],
					as: "owner.user.avatar"
				}
			},
			{
				$set: {
					"owner.user.avatar": {
						$arrayElemAt: ["$owner.user.avatar", 0]
					}
				}
			},
			{
				$unwind: {
					path: "$employees",
					preserveNullAndEmptyArrays: true
				}
			},
			//MEDIA
			{
				$lookup: {
					from: "users",
					let: { id: "$employees.user" },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ["$_id", "$$id"]
										}
									]
								}
							}
						}
					],
					as: "employees.user"
				}
			},
			{
				$set: {
					"employees.user": {
						$arrayElemAt: ["$employees.user", 0]
					}
				}
			},
			//MEDIA
			{
				$lookup: {
					from: "media",
					let: { id: "$employees.user.avatar" },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ["$_id", "$$id"]
										}
									]
								}
							}
						}
					],
					as: "employees.user.avatar"
				}
			},
			{
				$set: {
					"employees.user.avatar": {
						$arrayElemAt: ["$employees.user.avatar", 0]
					}
				}
			},
			{
				$group: {
					_id: "$_id",
					company: { $first: "$company" },
					list: { $first: "$list" },
					dates: { $first: "$dates" },
					description: { $first: "$description" },
					title: { $first: "$title" },
					status: { $first: "$status" },
					owner: { $first: "$owner" },
					tag: { $first: "$tag" },
					price: { $first: "$price" },
					created: { $first: "$created" },
					finished: { $first: "$finished" },
					employees: { $push: "$employees" }
				}
			},
			{
				$unwind: {
					path: "$list",
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$lookup: {
					from: "users",
					let: { id: "$list.employee.user" },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ["$_id", "$$id"]
										}
									]
								}
							}
						}
					],
					as: "list.employee.user"
				}
			},
			{
				$set: {
					"list.employee.user": {
						$arrayElemAt: ["$list.employee.user", 0]
					}
				}
			},
			//MEDIA
			{
				$lookup: {
					from: "media",
					let: { id: "$list.employee.user.avatar" },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ["$_id", "$$id"]
										}
									]
								}
							}
						}
					],
					as: "list.employee.user.avatar"
				}
			},
			{
				$set: {
					"list.employee.user.avatar": {
						$arrayElemAt: ["$list.employee.user.avatar", 0]
					}
				}
			},
			{
				$group: {
					_id: "$_id",
					company: { $first: "$company" },
					employees: { $first: "$employees" },
					dates: { $first: "$dates" },
					description: { $first: "$description" },
					title: { $first: "$title" },
					status: { $first: "$status" },
					owner: { $first: "$owner" },
					tag: { $first: "$tag" },
					price: { $first: "$price" },
					created: { $first: "$created" },
					finished: { $first: "$finished" },
					list: { $push: "$list" }
				}
			},
			...(afterAggregate || []),
			{ $sort: { created: -1 } }
		]).exec(function (err, pop) {
			if (err) {
				winsErr(req, err, "/task/get");
				return res.json({ success: true, tasks: [], all: 0 });
			}
			return res.json({
				success: true,
				tasks: pop,
				extra: extra,
				view: req.query.view,
				pageNum: parseInt(req.query.pageNum),
				all: all
			});
		});
	};
	router.get(
		"/task/get",
		(req, res, next) => auth.employee(req, res, next),
		function (req, res) {
			const {
				employee,
				search,
				starting_date,
				ending_date,
				subtag,
				status,
				company,
				pageNum,
				pageSize,
				view
			} = req.query;
			let filter = [],
				preAggregate = [],
				afterAggregate = [],
				selectedIds = [];
			if (status && status !== "all")
				filter.push({ $eq: ["$status", status] });
			else filter.push({ $ne: ["$status", "delete"] });
			if (search) {
				let searchReg = new RegExp(".*" + search + ".*", "i");
				filter.push({
					$or: [
						{
							$regexMatch: {
								input: "$title",
								regex: searchReg
							}
						},
						{
							$regexMatch: {
								input: "$description",
								regex: searchReg
							}
						}
					]
				});
			}
			if (companyAdministrator(req.employee)) {
				if (company && company !== "all")
					filter.push({ $eq: ["$company", ObjectId(company)] });
				else {
					let companies = [
						...(req.subsidiaries || []),
						req.company._id
					];
					companies = companies.map((comp) => ObjectId(comp));
					filter.push({
						company: {
							$in: ["$company", companies]
						}
					});
				}
			} else
				filter.push({ $eq: ["$company", ObjectId(req.company._id)] });
			if (view === "user") {
				GetEmployee(
					req,
					res,
					{
						pageNum: parseInt(pageNum),
						pageSize: parseInt(pageSize),
						employee,
						company
					},
					function (err, emps, all) {
						if (err) {
							winsErr(
								req,
								err,
								"/task/get - user.view - GetEmployee"
							);
						}
						selectedIds = (emps || []).map((emp) =>
							ObjectId(emp._id)
						);
						let filQ = [];
						(emps || []).map((emp) =>
							filQ.push({
								$in: [ObjectId(emp._id), "$employees.emp"]
							})
						);
						if (subtag && subtag !== "all")
							filter.push({ $eq: ["$tag", ObjectId(subtag)] });
						filter.push({
							$or: [
								{ $in: ["$owner.emp", selectedIds] },
								// {
								// 	$setIsSubset: [
								// 		selectedIds,
								// 		"$employees.emp"
								// 	]
								// },
								...(filQ || [])
							]
						});
						let filterQu = [
							{ $match: { $expr: { $and: filter } } }
						];
						filterQu = BetweenDates(
							starting_date,
							ending_date,
							filterQu
						);
						getTasks(
							req,
							res,
							filterQu,
							emps,
							preAggregate,
							afterAggregate,
							all
						);
					}
				);
				// filter.push({
				// 	$or: [
				// 		{ $eq: ["$owner.emp", ObjectId(req.employee)] },
				// 		{ $eq: ["$employees.emp", ObjectId(req.employee)] }
				// 	]
				// });
				// let filterQu = [{ $match: { $expr: { $and: filter } } }];
				// filterQu = BetweenDates(starting_date, ending_date, filterQu);
				// getTasks(
				// 	req,
				// 	res,
				// 	filterQu,
				// 	preAggregate,
				// 	afterAggregate
				// );
			} else if (view === "tag") {
				GetSubtags(
					req,
					res,
					{
						pageNum: parseInt(pageNum),
						pageSize: parseInt(pageSize),
						subtag,
						company
					},
					function (err, tags, all) {
						if (err) {
							winsErr(
								req,
								err,
								"/task/get - tag.view - GetSubtags"
							);
						}
						selectedIds = (tags || []).map((tag) => tag._id);
						filter.push({ $in: ["$tag", selectedIds] });
						if (companyAdministrator(req.employee)) {
							if (employee) {
								filter.push({
									$or: [
										{
											$eq: [
												"$owner.emp",
												ObjectId(employee)
											]
										},
										{
											$eq: [
												"$employees.emp",
												ObjectId(employee)
											]
										}
									]
								});
							}
						} else {
							filter.push({
								$or: [
									{
										$eq: [
											"$owner.emp",
											ObjectId(req.employee._id)
										]
									},
									{
										$eq: [
											"$employees.emp",
											ObjectId(req.employee._id)
										]
									}
								]
							});
						}
						let filterQu = [
							{ $match: { $expr: { $and: filter } } }
						];
						filterQu = BetweenDates(
							starting_date,
							ending_date,
							filterQu
						);
						getTasks(
							req,
							res,
							filterQu,
							tags,
							preAggregate,
							afterAggregate,
							all
						);
					}
				);
			} else {
				let dates = [],
					all = 1;
				const theDate = new Date(starting_date);
				const endDate = new Date(ending_date);
				while (theDate <= endDate) {
					dates = [...dates, new Date(moment(theDate).startOf())];
					theDate.setDate(theDate.getDate() + 1);
					// all++;
				}
				if (companyAdministrator(req.employee)) {
					if (employee) {
						filter.push({
							$or: [
								{ $eq: ["$owner.emp", ObjectId(employee)] },
								{ $eq: ["$employees.emp", ObjectId(employee)] }
							]
						});
					}
					// let companies = [
					// 	...(req.subsidiaries || []),
					// 	req.company._id
					// ];
					// filter.push({
					// 	company: {
					// 		$in: ["$company", companies]
					// 	}
					// });
					let companies = [
						...(req.subsidiaries || []).map(comp => ObjectId(comp._id)),
						ObjectId(req.company._id)
					];
					filter.push({
						$in: ["$company", companies]
					});
				} else {
					filter.push({
						$or: [
							{ $eq: ["$owner.emp", ObjectId(req.employee._id)] },
							{
								$eq: [
									"$employees.emp",
									ObjectId(req.employee._id)
								]
							}
						]
					});
					filter.push({
						$eq: ["$company", ObjectId(req.company._id)]
					});
				}
				if (subtag && subtag !== "all")
					filter.push({ $eq: ["$tag", ObjectId(subtag)] });
				let filterQu = [{ $match: { $expr: { $and: filter } } }];
				filterQu = BetweenDates(starting_date, ending_date, filterQu);
				getTasks(
					req,
					res,
					filterQu,
					dates,
					preAggregate,
					afterAggregate,
					all
				);
			}
		}
	);
	router.post(
		"/task/create",
		(req, res, next) => auth.employee(req, res, next),
		function (req, res) {
			const {
				_id,
				employees,
				title,
				description,
				dates,
				tag,
				price,
				list,
				owner,
				filters,
				employee
			} = req.body;

			//Employees
			let employs, date;
			if (employees && (employees || []).length > 0) {
				employs = (employees || []).map((emps) => {
					return {
						emp: emps._id,
						user: emps.user
					};
				});
			}

			//Other required fields
			if (!title || (title || "").trim() === "")
				return res.json({
					success: false,
					msg: locale("task_routers_all.title_empty")
				});
			if (!dates || (dates || []).length === 0) {
				date = [moment().startOf().format("YYYY-MM-DD")];
			} else {
				date = dates;
			}
			if (
				employs &&
				(employs || []).length > 0 &&
				(employs || []).some(
					(employ) => Object.keys(employ || {}).length === 0
				)
			)
				return res.json({
					success: false,
					msg: locale("task_routers_all.employee_info_error")
				});

			if (_id && isId(_id)) {
				//Edit
				Task.findOne({
					_id,
					status: { $in: ["doing", "declined"] }
				}).exec(function (err, task) {
					if (err) {
						winsErr(req, err, "/task/create - task.findOne()");
						return res.json({
							success: false,
							msg: locale("system_err")
						});
					}
					if (task) {
						if (
							(task.employees || []).some(
								(empss) =>
									((empss || {}).emp || "as").toString() ===
									(req.employee._id || "").toString()
							)
						) {
							task.title = title;
							task.description = description;
							task.dates = date;
							task.list = (list || []).map((li) => {
								return {
									text: li.text,
									status: li.status,
									employee: {
										emp: (li.employee || {}).emp,
										user: ((li.employee || {}).user || {})
											._id
									}
								};
							});
							task.employees = (employs || []).map((employ) => {
								return {
									emp: employ.emp,
									user: employ.user._id
								};
							});
							if (Object.keys(tag || {}).length > 0)
								task.tag = tag._id;
							else task.tag = null;
							task.price = price;
							if (task.status === "declined")
								task.status = "doing";

							//Edit save

							task.save((err, saved) => {
								if (err) {
									winsErr(
										req,
										err,
										"/task/create - task.save()"
									);
									return res.json({
										success: false,
										msg: `${locale("system_err")} 2`
									});
								}
								return res.json({
									success: true,
									task: {
										...saved._doc,
										list: list,
										employees: employs,
										owner: {
											emp: req.employee._id,
											user: req.user
										},
										tag: tag,
										dates: date
									},
									_id: _id || saved._id,
									filter: filters
								});
							});
						} else {
							return res.json({
								success: false,
								msg: locale("role_insufficient")
							});
						}
					} else {
						return res.json({
							success: false,
							msg: locale("task_routers_all.task_not_found")
						});
					}
				});
			} else {
				//New task
				let task = new Task();
				task.title = title;
				task.description = description;
				task.dates = date;
				task.list = (list || []).map((li) => {
					return {
						text: li.text,
						status: li.status,
						employee: {
							emp: (li.employee || {}).emp,
							user: ((li.employee || {}).user || {})._id
						}
					};
				});
				task.owner = { emp: req.employee._id, user: req.user._id };
				if (employee && Object.keys(employee || {}).length > 0) {
					employs = [
						...(employs || []),
						{ emp: employee._id, user: employee.user }
					];
					task.company = employee.company;
				} else {
					employs = [
						...(employs || []),
						{ emp: req.employee._id, user: req.user }
					];
					task.company = req.company._id;
				}
				task.employees = (employs || []).map((employ) => {
					return {
						emp: employ.emp,
						user: employ.user._id
					};
				});
				if (Object.keys(tag || {}).length > 0) task.tag = tag._id;
				else task.tag = null;
				task.price = price;
				task.save((err, saved) => {
					//New task save
					if (err) {
						winsErr(req, err, "/create/task - task.save()");
						return res.json({
							success: false,
							msg: `${locale("system_err")} 3`
						});
					}
					return res.json({
						success: true,
						task: {
							...saved._doc,
							list: list,
							employees: employs,
							owner: {
								emp: req.employee._id,
								user: req.user
							},
							tag: tag,
							dates: date
						},
						filter: filters
					});
				});
			}
		}
	);
	router.post(
		"/task/change",
		(req, res, next) => auth.employee(req, res, next),
		function (req, res) {
			const { _id, status } = req.body;
			if (!_id || !isId(_id) || !status)
				return res.json({
					success: false,
					msg: locale("task_routers_all.info_wrong")
				});
			Task.findOne({
				_id,
				status: { $in: ["doing", "done", "declined"] }
			}).exec(function (err, task) {
				if (err) {
					winsErr(req, err, "/task/change - task.findOne()");
					return res.json({
						success: false,
						msg: `${locale("system_err")} 1`
					});
				}
				if (task) {
					if (status !== "doing" && task.status === "done") {
						return res.json({
							success: false,
							msg: locale("task_routers_all.pending_task_no_change")
						});
					}
					if (
						(task.employees || []).some(
							(empss) =>
								(empss.emp || "as").toString() ===
								(req.employee._id || "").toString()
						)
					) {
						if (task.status === "done" && status !== "doing") {
							return res.json({
								success: false,
								msg: locale("task_routers_all.pending_task_no_change")
							});
						}
						task.status = status;
						task.save((err, saved) => {
							if (err) {
								winsErr(req, err, "/task/change - task.save()");
								return res.json({
									success: false,
									msg: `${locale("system_err")} 2`
								});
							}
							return res.json({
								success: true,
								_id: _id || saved._id,
								status: status,
								access: companyAdministrator(req.employee)
							});
						});
					} else {
						return res.json({
							success: false,
							msg: locale("role_insufficient")
						});
					}
				} else {
					return res.json({ success: false, msg: locale("task_routers_all.task_not_found") });
				}
			});
		}
	);
	router.post(
		"/task/finish",
		(req, res, next) => auth.companyAdministrator(req, res, next),
		function (req, res) {
			const { _id, status } = req.body;
			if (!_id || !isId(_id) || !status)
				return res.json({
					success: false,
					msg: locale("task_routers_all.info_wrong")
				});
			Task.findOne({
				_id,
				status: { $in: ["done", "declined"] }
			}).exec(function (err, task) {
				if (err) {
					winsErr(req, err, "/task/finish - task.findOne()");
					return res.json({
						success: false,
						msg: `${locale("system_err")} 1`
					});
				}
				if (task) {
					task.status = status;
					task.save((err, saved) => {
						if (err) {
							winsErr(req, err, "/task/finish - task.save()");
							return res.json({
								success: false,
								msg: `${locale("system_err")} 2`
							});
						}
						return res.json({
							success: true,
							_id: _id || saved._id,
							status: status
						});
					});
				} else {
					return res.json({ success: false, msg: locale("task_routers_all.task_not_found") });
				}
			});
		}
	);
	router.get(
		"/task/get/done",
		(req, res, next) => auth.companyAdministrator(req, res, next),
		function (req, res) {
			let companies = [...(req.subsidiaries || []), req.company._id];
			companies = companies.map((comp) => ObjectId(comp));
			getTasks(
				req,
				res,
				[
					{
						$match: {
							$expr: {
								$and: [
									{
										$in: ["$company", companies]
									},
									{ $eq: ["$status", "done"] }
								]
							}
						}
					}
				],
				[],
				[],
				[],
				0
			);
		}
	);
	router.get(
		"/task/get/idle",
		(req, res, next) => auth.employee(req, res, next),
		function (req, res) {
			getTasks(
				req,
				res,
				[
					{
						$match: {
							$expr: {
								$and: [
									{
										$or: [
											{
												$in: [
													ObjectId(req.employee._id),
													"$employees.emp"
												]
											},
											{
												$eq: [
													"$owner.emp",
													ObjectId(req.employee._id)
												]
											}
										]
									},
									{ $eq: ["$status", "doing"] }
								]
							}
						}
					}
				],
				[],
				[],
				[],
				0
			);
		}
	);
};
