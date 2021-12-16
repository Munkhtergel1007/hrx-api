import auth from "../../auth";
import bcrypt from "bcrypt-node";
import Company from "../../models/Company";
import User from "../../models/User";
import Employee from "../../models/Employee";
import CV from "../../models/cv_emp";
import Roles from "../../models/Roles";
import Break from "../../models/Break";
import Media from "../../models/Media";
import Vacation from "../../models/Vacation";
import Timetable from "../../models/Timetable";
import Salary from "../../models/Salary";
import OrientationEmployee from "../../models/OrientationEmployee";
import Reference from "../../models/Reference";
import MassAttendance from "../../models/MassAttendance";
import Work_plan from "../../models/Work_plan";
import Work_plan_job from "../../models/Work_plan_job";
import Job from "../../models/Job";
import async, { transform } from "async";
import {locale} from "../../lang";
import {
	winsErr,
	isId,
	isPhoneNum,
	string,
	isValidDate,
	checkIfDayInGap,
	getDatesBetweenDates
} from "../../config";
import moment from "moment";
const mongoose = require("mongoose");
let ObjectId = mongoose.Types.ObjectId;

//IMPORT
import XLSX from "xlsx";
var fs = require("fs");
var path = require("path");
const utils = XLSX.utils;
var multer = require("multer");

let importExStore = multer.diskStorage({
	destination: function (req, file, cb) {
		let aa = path.resolve(__dirname, "../../excel/");
		fs.mkdir(aa, function (e) {
			if (!e || (e && e.code === "EEXIST")) {
				cb(null, aa);
			} else {
				cb(null, path.resolve(__dirname, "../../excel/"));
			}
		});
	},
	filename: function (req, file, cb) {
		cb(null, Date.now() + "-" + file.originalname);
	}
});
let excelImport = multer({ storage: importExStore }).single("image");

module.exports = function (router) {
	const FindUser = function (req, res, callback) {
		Employee.findOne({
			_id: req.params.employee,
			company: { $in: [...(req.subsidiaries || []), req.company._id] },
			status: "active"
		})
			.lean()
			.exec(function (err, emp) {
				if (err) {
					winsErr(req, res, "Employee.findOne()");
				}
				if (emp) {
					User.findOne({ _id: emp.user }).exec(function (err, usr) {
						if (err) {
							winsErr(req, res, "User.findOne()");
						}
						if (usr) {
							callback(null, usr);
						} else {
							callback(
								{
									success: false,
									msg: locale("user_not_found"),
									setMarriage: true,
									body: req.body
								},
								null
							);
						}
					});
				} else {
					callback(
						{
							success: false,
							msg: locale("employee_not_found"),
							setMarriage: true,
							body: req.body
						},
						null
					);
				}
			});
	};
	const getAvatar = function (req, res, employees, callback) {
		let avatarIds = [];
		(employees || []).map((employee) =>
			(employee.user || {}).avatar
				? avatarIds.push((employee.user || {}).avatar)
				: null
		);
		Media.find({ _id: { $in: avatarIds }, status: "active" }).exec(
			function (err, media) {
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
			}
		);
	};
	router.get(
		"/get/employee/some_cv/:employee",
		(req, res, next) =>
			auth.company(
				req,
				res,
				next,
				["create_employee", "edit_employee"],
				true
			),
		function (req, res) {
			if (isId(req.params.employee)) {
				Employee.findOne({
					_id: req.params.employee,
					status: { $nin: ["delete", "fired"] },
					company: {
						$in: [...(req.subsidiaries || []), req.company._id]
					}
				})
					.deepPopulate(["dismissal_info", "role"])
					.lean()
					.exec(function (err, emp) {
						if (err) {
							winsErr(req, err, "Employee.findOne");
						}
						if (emp) {
							CV.findOne(
								{ user: emp.user, company: req.company._id },
								{
									salary_info:
										(
											((req.employee || {}).role || {})
												.actions || []
										).indexOf("read_employee_salary_info") >
											-1 ||
										(req.employee || {}).staticRole ===
											"chairman" ||
										(req.employee || {}).staticRole ===
											"hrManager" ||
										(req.employee || {}).staticRole ===
											"lord"
											? 1
											: 0,
									violation_info:
										(
											((req.employee || {}).role || {})
												.actions || []
										).indexOf("read_violation_employee") >
											-1 ||
										(req.employee || {}).staticRole ===
											"chairman" ||
										(req.employee || {}).staticRole ===
											"hrManager" ||
										(req.employee || {}).staticRole ===
											"lord"
											? 1
											: 0,
									reward:
										(
											((req.employee || {}).role || {})
												.actions || []
										).indexOf("read_reward_employee") >
											-1 ||
										(req.employee || {}).staticRole ===
											"chairman" ||
										(req.employee || {}).staticRole ===
											"hrManager" ||
										(req.employee || {}).staticRole ===
											"lord"
											? 1
											: 0
								}
							)
								.lean()
								.exec(function (err, cv) {
									return res.json({ success: !err, cv: cv });
								});
						} else {
							return res.json({
								success: false,
								msg: locale("employee_not_found")
							});
						}
					});
			} else {
				return res.status(404).end();
			}
		}
	);
	router.get(
		"/get/employee/:employee",
		(req, res, next) =>
			auth.company(
				req,
				res,
				next,
				["create_employee", "edit_employee"],
				true
			),
		function (req, res) {
			if (isId(req.params.employee)) {
				Employee.findOne({
					_id: req.params.employee,
					status: { $nin: ["delete", "fired"] },
					company: {
						$in: [...(req.subsidiaries || []), req.company._id]
					}
				})
					.deepPopulate(["dismissal_info", "role", "timetable"])
					.lean()
					.exec(function (err, emp) {
						if (err) {
							winsErr(req, err, "Employee.findOne");
						}
						if (emp) {
							if (
								(emp.company || "as").toString() ===
								((req.employee || {}).company || "").toString()
							) {
								User.findOne(
									{ _id: emp.user },
									{ password: 0, status: 0 }
								)
									.deepPopulate(["avatar"])
									.exec(function (err, usr) {
										if (err) {
											winsErr(req, err, "User.findOne");
										}
										if (usr) {
											return res.json({
												success: !err,
												employee: { ...emp, user: usr }
											});
										} else {
											return res.json({
												success: false,
												msg: locale("employee_not_found")
											});
										}
									});
							} else {
								return res.status(404).end();
							}
						} else {
							return res.json({
								success: false,
								msg: locale("employee_not_found")
							});
						}
					});
			} else {
				return res.status(404).end();
			}
		}
	);
	// router.post('/edit/:employee/info/family', (req, res, next) => auth.company(req, res, next, ['create_employee', 'edit_employee'], true), function(req, res){
	router.post(
		"/edit/:employee/info/family",
		(req, res, next) =>
			auth.company(req, res, next, ["create_employee", "edit_employee"], true),
		function (req, res) {
			const {
				isMarried,
				emp,
				first_name,
				hen_boloh,
				last_name,
				phone,
				phone1,
				phone2,
				work_place,
				_id,
				action,
				birthday
			} = req.body || {};
			if (typeof isMarried === "boolean") {
				FindUser(req, res, (errJson, user) => {
					if (errJson) {
						return res.json(errJson);
					} else {
						user.family.isMarried = isMarried;
						user.save((err, newUser) => {
							if (err) {
								winsErr(req, res, "usr.save()");
							}
							return res.json({
								success: !err,
								setMarriage: true,
								body: req.body,
								sucmod: !err,
								msg: err
									? locale("employee_routers_all.family.edit_error")
									: locale("employee_routers_all.family.edit_success")
							});
						});
					}
				});
			} else if (action === "delete") {
				//delete
				Employee.findOne({
					_id: req.params.employee,
					company: {
						$in: [...(req.subsidiaries || []), req.company._id]
					},
					status: "active"
				}).exec(function (err, emp) {
					if (err) {
						winsErr(req, res, "Employee.findOne()");
					}
					if (emp) {
						User.findOneAndUpdate(
							{ _id: emp.user },
							{
								$pull: {
									"family.familyMembers": { _id: isId(_id) }
								}
							},
							{ new: true }
						).exec(function (err, userFamily) {
							if (err) {
								winsErr(req, res, "User.updateOne()");
							}
							if (userFamily) {
								return res.json({
									success: !err,
									fmember: userFamily.family.familyMembers,
									_id: _id,
									sucmod: !err,
									msg: err
										? locale("employee_routers_all.family.delete_error")
										: locale("employee_routers_all.family.delete_success")
								});
							}
						});
					}
				});
			} else {
				if (_id) {
					// edit
					FindUser(req, res, (errJson, user) => {
						if (errJson) {
							return res.json(errJson);
						} else {
							if (
								user.family &&
								user.family.familyMembers &&
								user.family.familyMembers.length > 0
							) {
								user.family.familyMembers.map(function (r) {
									if (
										(r._id || "aa").toString() ===
										(_id || "d").toString()
									) {
										r.first_name = string(first_name);
										r.hen_boloh = string(hen_boloh);
										r.last_name = string(last_name);
										r.phone = isPhoneNum(phone);
										r.phone1 = isPhoneNum(phone1);
										r.phone2 = isPhoneNum(phone2);
										r.work_place = string(work_place);
										r.birthday = isValidDate(birthday);
									}
								});
							}
							user.save((err, newUser) => {
								if (err) {
									winsErr(req, res, "usr.save()");
								}
								return res.json({
									success: !err,
									fmember: newUser.family.familyMembers,
									_id: _id,
									sucmod: !err,
									msg: err
										? locale("employee_routers_all.family.edit_error")
										: locale("employee_routers_all.family.edit_success")
								});
							});
						}
					});
				} else {
					// create
					FindUser(req, res, (errJson, user) => {
						if (errJson) {
							return res.json(errJson);
						} else {
							user.family.familyMembers.push({
								first_name: string(first_name),
								hen_boloh: string(hen_boloh),
								last_name: string(last_name),
								phone: isPhoneNum(phone),
								phone1: isPhoneNum(phone1),
								phone2: isPhoneNum(phone2),
								work_place: string(work_place),
								birthday: isValidDate(birthday)
							});
							user.save((err, newUser) => {
								if (err) {
									winsErr(req, res, "usr.save()");
								}
								return res.json({
									success: !err,
									fmember: newUser.family.familyMembers,
									sucmod: !err,
									msg: err
										? locale("employee_routers_all.family.edit_error")
										: locale("employee_routers_all.family.edit_success")
								});
							});
						}
					});
				}
			}
		}
	);
	// router.post('/edit/:employee/info/profession', (req, res, next) => auth.company(req, res, next, ['create_employee', 'edit_employee'], true), function(req, res){
	router.post(
		"/edit/:employee/info/profession",
		(req, res, next) =>
			auth.company(req, res, next, ["create_employee", "edit_employee"], true),
		function (req, res) {
			const {
				name,
				graduatedDate, // tugssun ognoo
				enrolledDate, // ellsen ognoo
				type, // bolowsroliin zereg ["diplomiin","bachelor","magistr","dr", "other", ""]
				diplomId,
				mergejil,
				mergeshil,
				professionType, // bolowsroliin zereg
				_id,
				gpa,
				action
			} = req.body || {};
			if (gpa < 0 || gpa > 100)
				return res.json({
					success: false,
					msg: locale("employee_routers_all.education.points_error")
				});
			if (professionType && string(professionType) !== "") {
				FindUser(req, res, (errJson, user) => {
					if (errJson) {
						return res.json(errJson);
					} else {
						user.professionType = string(professionType);
						user.save((err, newUser) => {
							if (err) {
								winsErr(req, res, "user.save()");
							}
							return res.json({
								success: !err,
								profType: true,
								body: req.body,
								sucmod: !err,
								msg: err
									? locale("employee_routers_all.education.edit_error")
									: locale("employee_routers_all.education.edit_success")
							});
						});
					}
				});
			} else if (action === "delete") {
				//delete
				Employee.findOne({
					_id: req.params.employee,
					company: {
						$in: [...(req.subsidiaries || []), req.company._id]
					},
					status: "active"
				}).exec(function (err, emp) {
					if (err) {
						winsErr(req, res, "Employee.findOne()");
					}
					if (emp) {
						User.findOneAndUpdate(
							{ _id: emp.user },
							{ $pull: { profession: { _id: isId(_id) } } },
							{ new: true }
						).exec(function (err, userProf) {
							if (err) {
								winsErr(req, res, "User.updateOne()");
							}
							if (userProf) {
								return res.json({
									success: !err,
									sucmod: !err,
									body: req.body,
									profession: userProf.profession,
									msg: err
										? locale("employee_routers_all.education.delete_error")
										: locale("employee_routers_all.education.delete_success")
								});
							}
						});
					}
				});
			} else {
				if (enrolledDate && !isValidDate(enrolledDate)) {
					return res.json({
						success: false,
						msg: locale("employee_routers_all.education.enrolled_date_error")
					});
				} else if (graduatedDate && !isValidDate(graduatedDate)) {
					return res.json({
						success: false,
						msg: locale("employee_routers_all.education.graduated_date_error")
					});
				} else {
					if (_id) {
						//edit
						FindUser(req, res, (errJson, user) => {
							if (errJson) {
								return res.json(errJson);
							} else {
								if (
									user.profession &&
									user.profession.length > 0
								) {
									user.profession.map(function (r) {
										if (
											(r._id || "aa").toString() ===
											(_id || "d").toString()
										) {
											(r.name = string(name)),
												(r.graduatedDate =
													isValidDate(graduatedDate)),
												(r.enrolledDate =
													isValidDate(enrolledDate)),
												(r.type = string(type)),
												(r.diplomId = string(diplomId)),
												(r.mergejil = string(mergejil)),
												(r.mergeshil =
													string(mergeshil)),
												(r.gpa = string(gpa));
										}
									});
								}
								user.save((err, newUser) => {
									if (err) {
										winsErr(req, res, "usr.save()");
									}
									return res.json({
										success: !err,
										sucmod: !err,
										body: req.body,
										profession: newUser.profession,
										msg: err
											? locale("employee_routers_all.education.edit_error")
											: locale("employee_routers_all.education.edit_success")
									});
								});
							}
						});
					} else {
						//create
						FindUser(req, res, (errJson, user) => {
							if (errJson) {
								return res.json(errJson);
							} else {
								user.profession.push({
									name: string(name),
									graduatedDate: isValidDate(graduatedDate),
									enrolledDate: isValidDate(enrolledDate),
									type: string(type),
									diplomId: string(diplomId),
									mergejil: string(mergejil),
									mergeshil: string(mergeshil),
									gpa: string(gpa)
								});
								user.save((err, newUser) => {
									if (err) {
										winsErr(req, res, "user.save()");
									}
									return res.json({
										success: !err,
										sucmod: !err,
										body: req.body,
										profession: newUser.profession,
										msg: err
											? locale("employee_routers_all.education.edit_error")
											: locale("employee_routers_all.education.edit_success")
									});
								});
							}
						});
					}
				}
			}
		}
	);
	// router.post('/edit/:employee/info/qualification_training', (req, res, next) => auth.company(req, res, next, ['create_employee', 'edit_employee'], true), function(req, res){
	router.post(
		"/edit/:employee/info/qualification_training",
		(req, res, next) =>
			auth.company(req, res, next, ["create_employee", "edit_employee"], true),
		function (req, res) {
			const {
				name,
				company, // herew surj baisan surgaltiin baiguullaga manai system d bvrtgeltei bol. / hereglegch vvsgeh eswel hvnii nuutsiin ajiltan nemeh ved hailt dundaas garj irne /
				start_date, // surgalt ehelsen udur
				end_date, // surgalt duussan udur
				chiglel,
				gerchilgeenii_dugaar, // vnemleh eswel gerchilgeenii dugaar
				gerchilgee_date, // vnemleh eswel gerchilgee awsan udur
				_id,
				action
			} = req.body || {};
			if (action === "delete") {
				// delete
				Employee.findOne({
					_id: req.params.employee,
					company: {
						$in: [...(req.subsidiaries || []), req.company._id]
					},
					status: "active"
				}).exec(function (err, emp) {
					if (err) {
						winsErr(req, res, "Employee.findOne()");
					}
					if (emp) {
						User.findOneAndUpdate(
							{ _id: emp.user },
							{
								$pull: {
									qualification_training: { _id: isId(_id) }
								}
							},
							{ new: true }
						).exec(function (err, userQtraining) {
							if (err) {
								winsErr(req, res, "User.updateOne()");
							}
							if (userQtraining) {
								return res.json({
									success: !err,
									sucmod: !err,
									body: req.body,
									qualification_training:
										userQtraining.qualification_training,
									msg: err
										? locale("employee_routers_all.qualification_training.delete_error")
										: locale("employee_routers_all.qualification_training.delete_success")
								});
							}
						});
					}
				});
			} else {
				if (start_date && !isValidDate(start_date)) {
					return res.json({
						success: false,
						msg: locale("employee_routers_all.qualification_training.entry_date_error")
					});
				} else if (end_date && !isValidDate(end_date)) {
					return res.json({
						success: false,
						msg: locale("employee_routers_all.qualification_training.exit_date_error")
					});
				} else if (gerchilgee_date && !isValidDate(gerchilgee_date)) {
					return res.json({
						success: false,
						msg: locale("employee_routers_all.qualification_training.degree_date_error")
					});
				} else {
					if (_id) {
						//edit
						FindUser(req, res, (errJson, user) => {
							if (errJson) {
								return res.json(errJson);
							} else {
								if (
									user.qualification_training &&
									user.qualification_training.length > 0
								) {
									user.qualification_training.map(function (
										r
									) {
										if (
											(r._id || "aa").toString() ===
											(_id || "d").toString()
										) {
											(r.name = string(name)),
												(r.end_date =
													isValidDate(end_date)),
												(r.start_date =
													isValidDate(start_date)),
												(r.chiglel = string(chiglel)),
												(r.gerchilgeenii_dugaar =
													string(
														gerchilgeenii_dugaar
													)),
												(r.company = isId(company)),
												(r.gerchilgee_date =
													isValidDate(
														gerchilgee_date
													));
										}
									});
								}
								user.save((err, newUser) => {
									if (err) {
										winsErr(req, res, "usr.save()");
									}
									return res.json({
										success: !err,
										sucmod: !err,
										body: req.body,
										qualification_training:
											newUser.qualification_training,
										msg: err
											? locale("employee_routers_all.qualification_training.edit_error")
											: locale("employee_routers_all.qualification_training.edit_success")
									});
								});
							}
						});
					} else {
						FindUser(req, res, (errJson, user) => {
							if (errJson) {
								return res.json(errJson);
							} else {
								user.qualification_training.push({
									name: string(name),
									end_date: isValidDate(end_date),
									start_date: isValidDate(start_date),
									chiglel: string(chiglel),
									gerchilgeenii_dugaar:
										string(gerchilgeenii_dugaar),
									company: isId(company),
									gerchilgee_date:
										isValidDate(gerchilgee_date)
								});
								user.save((err, newUser) => {
									if (err) {
										winsErr(req, res, "user.save()");
									}
									return res.json({
										success: !err,
										sucmod: !err,
										body: req.body,
										qualification_training:
											newUser.qualification_training,
										msg: err
											? locale("employee_routers_all.qualification_training.edit_error")
											: locale("employee_routers_all.qualification_training.edit_success")
									});
								});
							}
						});
					}
				}
			}
		}
	);
	// router.post('/edit/:employee/info/experience', (req, res, next) => auth.company(req, res, next, ['create_employee', 'edit_employee'], true), function(req, res){
	router.post(
		"/edit/:employee/info/experience",
		(req, res, next) =>
			auth.company(req, res, next, ["create_employee", "edit_employee"], true),
		function (req, res) {
			const {
				name,
				company, // herew ajillaj baisan baiguullaga manai system d bvrtgeltei bol. / hereglegch vvsgeh eswel hvnii nuutsiin ajiltan nemeh ved hailt dundaas garj irne /
				position,
				workFrom,
				workUntil,
				_id,
				action
			} = req.body || {};
			if (action === "delete") {
				//delete
				Employee.findOne({
					_id: req.params.employee,
					company: {
						$in: [...(req.subsidiaries || []), req.company._id]
					},
					status: "active"
				}).exec(function (err, emp) {
					if (err) {
						winsErr(req, res, "Employee.findOne()");
					}
					if (emp) {
						User.findOneAndUpdate(
							{ _id: emp.user },
							{ $pull: { work_experience: { _id: isId(_id) } } },
							{ new: true }
						).exec(function (err, userExperience) {
							if (err) {
								winsErr(req, res, "User.updateOne()");
							}
							if (userExperience) {
								return res.json({
									success: !err,
									sucmod: !err,
									body: req.body,
									work_experience:
										userExperience.work_experience,
									msg: err
										? locale("employee_routers_all.experience.delete_error")
										: locale("employee_routers_all.experience.delete_success")
								});
							}
						});
					}
				});
			} else {
				if (workFrom && !isValidDate(workFrom)) {
					return res.json({
						success: false,
						msg: locale("employee_routers_all.experience.start_date_error")
					});
				} else if (workUntil && !isValidDate(workUntil)) {
					return res.json({
						success: false,
						msg: locale("employee_routers_all.experience.end_date_error")
					});
				} else {
					if (_id) {
						//edit
						FindUser(req, res, (errJson, user) => {
							if (errJson) {
								return res.json(errJson);
							} else {
								if (
									user.work_experience &&
									user.work_experience.length > 0
								) {
									user.work_experience.map(function (r) {
										if (
											(r._id || "aa").toString() ===
											(_id || "d").toString()
										) {
											(r.name = string(name)),
												(r.workFrom =
													isValidDate(workFrom)),
												(r.workUntil =
													isValidDate(workUntil)),
												(r.company =
													string(company) || null),
												(r.position = string(position));
										}
									});
								}
								user.save((err, newUser) => {
									if (err) {
										winsErr(req, res, "usr.save()");
									}
									return res.json({
										success: !err,
										sucmod: !err,
										body: req.body,
										work_experience:
											newUser.work_experience,
										msg: err
											? locale("employee_routers_all.experience.edit_error")
											: locale("employee_routers_all.experience.edit_success")
									});
								});
							}
						});
					} else {
						//create
						FindUser(req, res, (errJson, user) => {
							if (errJson) {
								return res.json(errJson);
							} else {
								user.work_experience.push({
									name: string(name),
									workFrom: isValidDate(workFrom),
									workUntil: isValidDate(workUntil),
									company: string(company) || null,
									position: string(position)
								});
								user.save((err, newUser) => {
									if (err) {
										winsErr(req, res, "user.save()");
									}
									return res.json({
										success: !err,
										sucmod: !err,
										body: req.body,
										work_experience:
											newUser.work_experience,
										msg: err
											? locale("employee_routers_all.experience.edit_error")
											: locale("employee_routers_all.experience.edit_success")
									});
								});
							}
						});
					}
				}
			}
		}
	);
	// router.post('/edit/:employee/info/skill', (req, res, next) => auth.company(req, res, next, ['create_employee', 'edit_employee'], true), function(req, res){
	router.post(
		"/edit/:employee/info/skill",
		(req, res, next) =>
			auth.company(req, res, next, ["create_employee", "edit_employee"], true),
		function (req, res) {
			const { name, _id, action, level } = req.body || {};
			if (action === "delete") {
				Employee.findOne({
					_id: req.params.employee,
					company: {
						$in: [...(req.subsidiaries || []), req.company._id]
					},
					status: "active"
				}).exec(function (err, emp) {
					if (err) {
						winsErr(req, res, "Employee.findOne()");
					}
					if (emp) {
						User.findOneAndUpdate(
							{ _id: emp.user },
							{ $pull: { ability: { _id: isId(_id) } } },
							{ new: true }
						).exec(function (err, userAbility) {
							if (err) {
								winsErr(req, res, "User.updateOne()");
							}
							if (userAbility) {
								return res.json({
									success: !err,
									sucmod: !err,
									body: req.body,
									ability: userAbility.ability,
									msg: err
										? locale("employee_routers_all.skill.delete_error")
										: locale("employee_routers_all.skill.delete_success")
								});
							}
						});
					}
				});
			} else {
				if (_id) {
					FindUser(req, res, (errJson, user) => {
						if (errJson) {
							return res.json(errJson);
						} else {
							if (user.ability && user.ability.length > 0) {
								user.ability.map(function (r) {
									if (
										(r._id || "aa").toString() ===
										(_id || "d").toString()
									) {
										(r.name = string(name)),
											(r.level = string(level));
									}
								});
							}
							user.save((err, newUser) => {
								if (err) {
									winsErr(req, res, "usr.save()");
								}
								return res.json({
									success: !err,
									sucmod: !err,
									body: req.body,
									ability: newUser.ability,
									msg: err
										? locale("employee_routers_all.skill.edit_error")
										: locale("employee_routers_all.skill.edit_success")
								});
							});
						}
					});
				} else {
					//create
					FindUser(req, res, (errJson, user) => {
						if (errJson) {
							return res.json(errJson);
						} else {
							user.ability.push({
								name: string(name),
								level: string(level)
							});
							user.save((err, newUser) => {
								if (err) {
									winsErr(req, res, "user.save()");
								}
								return res.json({
									success: !err,
									sucmod: !err,
									body: req.body,
									ability: newUser.ability,
									msg: err
										? locale("employee_routers_all.skill.edit_error")
										: locale("employee_routers_all.skill.edit_success")
								});
							});
						}
					});
				}
			}
		}
	);
	// router.post('/edit/:employee/info/military', (req, res, next) => auth.company(req, res, next, ['create_employee', 'edit_employee'], true), function(req, res){
	router.post(
		"/edit/:employee/info/military",
		(req, res, next) =>
			auth.company(req, res, next, ["create_employee", "edit_employee"], true),
		function (req, res) {
			const { wasInmilitary } = req.body || {};
			if (typeof wasInmilitary === "boolean") {
				FindUser(req, res, (errJson, user) => {
					if (errJson) {
						return res.json(errJson);
					} else {
						User.updateOne(
							{ _id: user._id },
							{ wasInmilitary: wasInmilitary },
							function (err, edited) {
								if (err) {
									winsErr(req, res, "user.save()");
								}
								return res.json({
									success: !err,
									sucmod: !err,
									body: req.body,
									wasInmilitary: err
										? user.wasInmilitary || false
										: wasInmilitary
								});
							}
						);
						// user.wasInmilitary = wasInmilitary;
						// user.save((err, newUser) => {
						//     if(err) {winsErr(req, res, 'user.save()')}
						//     return res.json({success: !(err), sucmod: !(err), body: req.body, wasInmilitary: user.wasInmilitary });
						// });
					}
				});
			} else {
				return res.json({
					success: false,
					msg: locale("employee_routers_all.served_military_empty")
				});
			}
		}
	);
	// router.post('/edit/:employee/info/main', (req, res, next) => auth.company(req, res, next, ['create_employee', 'edit_employee'], true), function(req, res){
	router.post(
		"/edit/:employee/info/main",
		(req, res, next) =>
			auth.company(req, res, next, ["create_employee", "edit_employee"], true),
		function (req, res) {
			const {
				address,
				birth_place,
				birthday,
				email,
				emailFromComp,
				family_name,
				phone,
				phoneFromComp,
				register_id,
				gender,
				nationality,
				hasChild,
				children,
				bloodType,
				drivingLicense,
				username,
				password,
				first_name,
				last_name,
				workFrom,
				position_name,
				cardId
			} = req.body || {};
			const bankName = (req.body || [])["bank.name"];
			const bankAccount = (req.body || [])["bank.account"];
			if (
				(bankName && bankName !== "" && bankAccount === "") ||
				(bankAccount && bankAccount !== "" && bankName === "")
			) {
				return res.json({
					success: false,
					msg: locale("employee_routers_all.check_bank_account_integrity")
				});
			}
			if (!isId(req.params.employee)) {
				return res.json({ success: false, msg: locale("employee_not_found") });
			} else {
				Employee.findOne({
					_id: req.params.employee,
					company: {
						$in: [...(req.subsidiaries || []), req.company._id]
					},
					status: "active"
				}).exec(function (err, emp) {
					if (err) {
						winsErr(req, res, "Employee.findOne()");
					}
					if (emp) {
						const saveUser = function () {
							User.findOne(
								{
									$and: [
										{ _id: { $ne: emp.user } },
										{
											$or: [
												{
													username:
														string(
															username
														).toLowerCase()
												},
												{
													email: string(
														email
													).toLowerCase()
												},
												{
													register_id: {
														$regex: new RegExp(
															"^" +
																register_id +
																"$",
															"i"
														)
													}
												}
											]
										}
									]
								},
								{ username: 1, email: 1, register_id: 1 }
							)
								.lean()
								.exec(function (err, user) {
									if (err) {
										winsErr(req, res, "User.findOne");
									}
									if (user) {
										Employee.findOne({
											status: "active",
											user: user._id
										})
											.lean()
											.exec(function (err, existingemp) {
												if (err) {
													winsErr(
														req,
														err,
														"Employee.findOne"
													);
												}
												if (existingemp) {
													return res.json({
														success: false,
														existing: user,
														userExists: true
													});
												}
											});
									} else {
										User.findOne({ _id: emp.user }).exec(
											function (err, usr) {
												if (err) {
													winsErr(
														req,
														res,
														"User.findOne()"
													);
												}
												if (usr) {
													usr.password = password
														? bcrypt.hashSync(
																string(password)
														  )
														: usr.password;
													usr.username =
														string(
															username
														).toLowerCase() ||
														usr.username;
													usr.first_name =
														first_name ||
														usr.first_name;
													usr.last_name =
														last_name ||
														usr.last_name;
													usr.address =
														address || usr.address;
													usr.birthday =
														isValidDate(birthday) ||
														usr.birthday;
													usr.birth_place =
														string(birth_place) ||
														usr.birth_place;
													usr.family_name =
														string(family_name) ||
														usr.family_name;
													usr.email =
														string(
															email
														).toLowerCase() ||
														usr.email;
													usr.phone =
														isPhoneNum(phone) ||
														usr.phone;
													usr.register_id =
														string(register_id) ||
														usr.register_id;
													usr.gender =
														string(gender) ||
														usr.gender;
													usr.nationality =
														string(nationality) ||
														usr.nationality;
													usr.bloodType =
														string(bloodType) ||
														usr.bloodType;
													usr.drivingLicense =
														drivingLicense ||
														usr.drivingLicense;
													if (hasChild) {
														usr.hasChild =
															hasChild ||
															usr.hasChild;
														usr.children = children;
													} else {
														usr.hasChild = hasChild;
														usr.children = 0;
													}
													usr.save((err, newUsr) => {
														if (err) {
															winsErr(
																req,
																res,
																"usr.save()"
															);
														}
														return res.json({
															success: !err,
															sucmod: !err,
															msg: !err
																? locale("employee_routers_all.general_information.edit_success")
																: locale("employee_routers_all.general_information.edit_error"),
															body: req.body
														});
													});
												} else {
													return res.json({
														success: false,
														msg: locale("user_not_found")
													});
												}
											}
										);
									}
								});
						};
						if (cardId && cardId !== "") {
							Employee.exists(
								{
									cardId: cardId,
									_id: { $ne: req.params.employee },
									status: { $nin: ["delete", "fired"] }
								},
								function (err, card) {
									if (card) {
										return res.json({
											success: false,
											msg: locale("employee_routers_all.general_information.card_id_repetition")
										});
									} else {
										// if(string(emailFromComp) || isPhoneNum(phoneFromComp) || isValidDate(workFrom)){
										emp.phoneFromComp =
											isPhoneNum(phoneFromComp); //|| emp.phoneFromComp
										emp.emailFromComp =
											string(emailFromComp).toLowerCase(); //|| emp.emailFromComp
										emp.workFrom = isValidDate(workFrom); //|| emp.workFrom
										emp.position_name =
											string(position_name); //|| emp.position_name;
										emp.cardId = string(cardId); // || emp.cardId
										if (
											bankName &&
											bankName !== "" &&
											bankAccount &&
											bankAccount !== ""
										) {
											emp.bank = {
												name: string(bankName),
												account: string(bankAccount)
											}; // || emp.bank
										}
										emp.save((err, newEmp) => {
											if (err) {
												winsErr(req, res, "emp.save()");
											}
											saveUser();
										});
										//     } else {
										//         saveUser();
										//     }
									}
								}
							);
						} else {
							// if(string(emailFromComp) || isPhoneNum(phoneFromComp) || isValidDate(workFrom)){
							emp.phoneFromComp = isPhoneNum(phoneFromComp); //|| emp.phoneFromComp
							emp.emailFromComp =
								string(emailFromComp).toLowerCase(); //|| emp.emailFromComp
							emp.workFrom = isValidDate(workFrom); //|| emp.workFrom
							emp.position_name = string(position_name); //|| emp.position_name;
							emp.cardId = string(cardId); // || emp.cardId
							if (bankName && bankAccount) {
								emp.bank = {
									name: string(bankName),
									account: string(bankAccount)
								}; // || emp.bank
							}
							emp.save((err, newEmp) => {
								if (err) {
									winsErr(req, res, "emp.save()");
								}
								saveUser();
							});
							//     } else {
							//         saveUser();
							//     }
						}
					} else {
						return res.json({
							success: false,
							msg: locale("employee_not_found")
						});
					}
				});
			}
		}
	);
	router.post(
		"/add/employee",
		(req, res, next) => auth.company(req, res, next),
		function (req, res) {
			const { user } = req.body || {};
			if (!isId(user)) {
				return res.json({
					success: false,
					msg: locale("employee_routers_all.general_information.choose_employee_user")
				});
			} else {
				User.findOne({ _id: user, status: "active" })
					.lean()
					.exec(function (err, usr) {
						if (usr) {
							Employee.findOne(
								{
									status: "active",
									user: user,
									company: req.company._id
								},
								{ company: 1, status: 1 }
							)
								.lean()
								.exec(function (err, emp) {
									if (err) {
										winsErr(req, err, "Employee.findOne");
									}
									if (emp) {
										return res.json({
											success: false,
											msg: locale("employee_routers_all.user.already_in_company")
										});
									} else {
										let employee = new Employee();
										employee.user = user;
										employee.company = req.company._id;
										employee.status = "active";
										employee.save((err, newEmp) => {
											if (err) {
												winsErr(req, err, "emp.save()");
											}
											return res.json({
												success: !err,
												sucmod: !err,
												msg: err
													? locale("employee_routers_all.user.creation_error")
													: locale("employee_routers_all.user.creation_success"),
												newEmployee: newEmp
											});
										});
									}
								});
						} else {
							return res.json({
								success: false,
								msg: locale("user_not_found")
							});
						}
					});
			}
		}
	);
	router.post(
		"/find/user",
		(req, res, next) => auth.company(req, res, next),
		function (req, res) {
			// const { phone, email } = req.body || {};
			// if(!isPhoneNum(phone)){
			//     return res.json({success: false, msg: 'Утасны дугаар оруулна уу.'});
			// } else if(!string(email)){
			//     return res.json({success: false, msg: 'И-мэйл оруулна уу.'});
			// } else {
			//     User.find({phone: isPhoneNum(phone), email: string(email).toLowerCase(), status: 'active'}, {avatar: 1, first_name: 1, last_name: 1, username: 1}).deepPopulate('avatar').lean().exec(function (err, user) {
			//         if(err){winsErr(req, res, 'User.find');}
			//         if(user.length){
			//             async.map(user, function(item, callback){
			//                 Employee.findOne({status: 'active', user: item._id, company:req.company._id}, {company: 1, status: 1}).deepPopulate(['company', 'company.logo']).lean().exec(function(err, emp){
			//                     if(err){winsErr(req, err, 'Employee.findOne');}
			//                     callback(err, {
			//                         ...item,
			//                         employee: emp
			//                     });
			//                 });
			//             }, function(err, usr){
			//                 if(err){winsErr(req, res, 'async.map');}
			//                 return res.json({success: true, users: usr});
			//             });
			//         } else {
			//             return res.json({success: false, users: user, msg: locale("user_not_found")});
			//         }
			//     })
			// }
			const { first_name, register_id } = req.body || {};
			const regex = /^[а-яА-ЯөӨүҮёЁ]{2}[0-9]{8}$/;
			if (!first_name || (first_name || "").trim() === "") {
				return res.json({ success: false, msg: locale("name_empty") });
			} else if (!register_id || !regex.test(register_id)) {
				return res.json({ success: false, msg: locale("registerIdError.insert") });
			} else {
				const regexName = new RegExp(
					".*" + (first_name || "").trim() + ".*",
					"i"
				);
				const regexRegisterID = new RegExp(
					".*" + (register_id || "").trim() + ".*",
					"i"
				);
				User.find(
					{
						first_name: { $regex: regexName },
						register_id: { $regex: regexRegisterID },
						status: "active"
					},
					{ avatar: 1, first_name: 1, last_name: 1, username: 1 }
				)
					.deepPopulate("avatar")
					.lean()
					.exec(function (err, user) {
						if (err) {
							winsErr(req, res, "User.find");
						}
						if (user.length) {
							async.map(
								user,
								function (item, callback) {
									Employee.findOne(
										{
											status: "active",
											user: item._id,
											company: req.company._id
										},
										{ company: 1, status: 1 }
									)
										.deepPopulate([
											"company",
											"company.logo"
										])
										.lean()
										.exec(function (err, emp) {
											if (err) {
												winsErr(
													req,
													err,
													"Employee.findOne"
												);
											}
											callback(err, {
												...item,
												employee: emp
											});
										});
								},
								function (err, usr) {
									if (err) {
										winsErr(req, res, "async.map");
									}
									return res.json({
										success: true,
										users: usr
									});
								}
							);
						} else {
							return res.json({
								success: false,
								users: user,
								msg: locale("user_not_found")
							});
						}
					});
			}
		}
	);
	router.post(
		"/create/user",
		(req, res, next) => auth.company(req, res, next, ["create_employee"]),
		function (req, res) {
			const {
				first_name,
				last_name,
				username,
				phone,
				email,
				password,
				register_id
			} = req.body || {};
			Company.findOne({ status: string(password) }).exec(function (
				err,
				comp
			) {
				if (string(first_name) === "") {
					return res.json({
						success: false,
						msg: locale("lastNameError.insert")
					});
				} else if (string(last_name) === "") {
					return res.json({ success: false, msg: locale("firstNameError.insert") });
				} else if (string(username) === "") {
					return res.json({
						success: false,
						msg: locale("usernameError.insert")
					});
				} else if (string(password) === "") {
					return res.json({
						success: false,
						msg: locale("passwordError.insert")
					});
				} else if (string(register_id) === "") {
					return res.json({
						success: false,
						msg: locale("registerIdError.insert")
					});
				} else {
					const emailRegex =
						/^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
					let filter = [
						{
							register_id: {
								$regex: new RegExp("^" + register_id + "$", "i")
							}
						},
						{ username: string(username).toLowerCase() }
					];
					let phoneReg = req.phone_regex;
					if (phone && phoneReg.test(phone)) {
						filter = [
							...filter,
							{ phone: (phone || '').toString().trim() }
						];
					} else {
						return res.json({
							success: false,
							msg: locale("phoneError.error")
						});
					}
					if ((email || "").trim() && (email || "").trim() !== "") {
						if (emailRegex.test((email || "").trim())) {
							filter = [
								...filter,
								{
									email: string(
										(email || "").trim()
									).toLowerCase()
								}
							];
						} else {
							return res.json({
								success: false,
								msg: locale("emailError.wrong")
							});
						}
					}
					User.findOne(
						{
							$or: filter
						},
						{
							avatar: 1,
							first_name: 1,
							last_name: 1,
							username: 1,
							email: 1,
							phone: 1,
							register_id: 1
						}
					)
						.deepPopulate("avatar")
						.lean()
						.exec(function (err, user) {
							if (err) {
								winsErr(req, err, "User.findOne()");
							}
							if (user) {
								Employee.findOne(
									{ status: "active", user: user._id },
									{ company: 1, status: 1 }
								)
									.deepPopulate(["company", "company.logo"])
									.lean()
									.exec(function (err, emp) {
										if (err) {
											winsErr(
												req,
												err,
												"Employee.findOne"
											);
										}
										return res.json({
											success: false,
											msg: locale("user_info_repetition"),
											user: user,
											employee: emp,
											exists: true
										});
									});
							} else {
								let usr = new User();
								usr.first_name = string(first_name);
								usr.last_name = string(last_name);
								usr.username = string(username).toLowerCase();
								usr.phone = isPhoneNum((phone || "").trim());
								usr.email = string(
									(email || "").trim()
								).toLowerCase();
								usr.status = "active";
								usr.password = bcrypt.hashSync(
									string(password)
								);
								usr.register_id =
									string(register_id).toLowerCase();
								usr.save((err, newUser) => {
									if (err) {
										winsErr(req, err, "usr.save()");
									}
									if (newUser) {
										let emp = new Employee();
										emp.user = newUser._id;
										emp.company = req.company._id;
										emp.status = "active";
										emp.save((err, newEmp) => {
											if (err) {
												winsErr(req, err, "emp.save()");
											}
											return res.json({
												success: !err,
												sucmod: !err,
												msg: err
													? locale("employee_routers_all.user.creation_error")
													: locale("employee_routers_all.user.creation_success"),
												user: newUser,
												newEmployee: newEmp
											});
										});
									} else {
										return res.json({
											success: false,
											msg: locale("employee_routers_all.user.creation_error")
										});
									}
								});
							}
						});
				}
			});
		}
	);
	// Ажилтны мэдээлэлд амралтын мэдээллийг хайн нэмж явуулах
	router.post(
		"/get/employees",
		(req, res, next) => auth.company(req, res, next, []),
		function (req, res) {
			const {
				pageNum = 0,
				pageSize = 0,
				search,
				staticRole,
				role,
				company
			} = req.body || {};
			let searchQu = { _id: { $ne: null } };
			let staticRoleQu = { staticRole: { $ne: "attendanceCollector" } };
			let roleQu = {};
			let companyQu = {};
			if (search && search !== "") {
				searchQu = {
					$and: [
						{
							$or: [
								{ email: { $regex: search, $options: "i" } },
								{
									first_name: {
										$regex: search,
										$options: "i"
									}
								},
								{
									last_name: { $regex: search, $options: "i" }
								},
								{ phone: { $regex: search, $options: "i" } }
							]
						},
						{ status: "active" }
					]
				};
			}
			if (staticRole && staticRole !== "all") {
				staticRoleQu = { staticRole: staticRole };
			}
			if (role && role !== "all") {
				roleQu = { role: role };
			}
			if (company && company !== "all") {
				companyQu = { company: company };
			}
			User.find(searchQu).exec(function (err, users) {
				if (err) {
					winsErr(req, res, "User.find()");
					return res.json({ success: false, msg: locale("system_err") });
				}
				let userQu = {};
				if (users && users.length > 0) {
					userQu = { user: { $in: users.map((r) => r._id) } }; //user field -ээс _id таарсан бүх хэрэглэгчийг авах
				}
				async.parallel(
					{
						allCount: function (cb) {
							// Employee.count({company: {$in: [...(req.subsidiaries || []), req.company._id]}, status: {$nin: ['delete', 'fired']}}, function(err, empC){
							Employee.countDocuments(
								{
									$and: [
										{
											status: {
												$nin: ["delete", "fired"]
											}
										},
										{
											company: {
												$in: [
													...(req.subsidiaries || []),
													req.company._id
												]
											}
										},
										userQu,
										staticRoleQu,
										roleQu,
										companyQu
									]
								},
								function (err, empC) {
									cb(err, empC);
								}
							);
						},
						allEmployees: function (cb) {
							Employee.find(
								{
									$and: [
										{
											status: {
												$nin: ["delete", "fired"]
											}
										},
										{
											company: {
												$in: [
													...(req.subsidiaries || []),
													req.company._id
												]
											}
										},
										userQu,
										staticRoleQu,
										roleQu,
										companyQu
									]
								},
								{
									_id: 1,
									user: 1,
									company: 1,
									role: 1,
									staticRole: 1,
									workFrom: 1
								}
							)
								.deepPopulate(["user", "role", "company.logo"])
								.sort({ company: 1, staticRole: -1 })
								.lean()
								.limit(pageSize)
								.skip(pageSize * pageNum)
								.exec(function (err, employees) {
									cb(err, employees);
								});
						},
						vacations: function (cb) {
							let now = moment().startOf("day").toISOString();
							let nowA = moment(now)
								.subtract(7, "hour")
								.toISOString();
							Vacation.find({
								status: "approved",
								company: {
									$in: [
										...(req.subsidiaries || []),
										req.company._id
									]
								},
								$or: [
									{ selected_dates: new Date(now) },
									{ selected_dates: new Date(nowA) }
								]
							}).exec(function (err, employees) {
								cb(err, employees);
							});
						}
					},
					function (err, data) {
						if (err) {
							winsErr(req, res, "/get/employees");
						}
						if (data) {
							/* Vacation -уудыг ажилтнуудын _id ашиглан нэмэх */
							(data.vacations || []).forEach((vacation) => {
								(data.allEmployees || []).forEach((person) => {
									if (
										vacation.employee.emp.equals(person._id)
									) {
										person.vacation = vacation;
									}
								});
							});

							return res.json({
								success: !err,
								employees: data.allEmployees,
								all: data.allCount
							});
						} else {
							return res.json({
								success: false,
								msg: locale("employee_not_found")
							});
						}
					}
				);
			});
		}
	);
	router.get(
		"/get/subsidiary/companies",
		(req, res, next) => auth.employee(req, res, next),
		function (req, res) {
			Company.find(
				{ parent: req.company._id, status: { $ne: "delete" } },
				{ name: 1 }
			).exec(function (err, companies) {
				if (err) {
					winsErr(
						req,
						err,
						"Company.find() - /get/subsidiary/companies"
					);
					return res.json({ success: true, companies: [] });
				}
				return res.json({ success: true, companies: companies });
			});
		}
	);
	router.post(
		"/add/:employee/info/violation",
		(req, res, next) =>
			auth.company(req, res, next, [
				"read_violation_employee",
				"add_violation_employee"
			]),
		function (req, res) {
			const {
				aboutViolation,
				date,
				tushaalText,
				tushaalFile,
				comp,
				_id
			} = req.body || {};
			if (isId(req.body.user)) {
				CV.findOne({ user: req.body.user, company: req.company._id })
					.deepPopulate("company")
					.exec(function (err, user) {
						if (err) {
							winsErr(req, res, "/info/violation/");
						}
						if (user) {
							// UPDATE CV
							if (_id) {
								// edit
								(user.violation_info || []).map(function (r) {
									if (
										(r._id || "ad").toString() ===
										(_id || "dw").toString()
									) {
										r.aboutViolation =
											string(aboutViolation);
										r.date = isValidDate(date);
										r.tushaalText = string(tushaalText);
										r.tushaalFile = isId(tushaalFile);
									}
								});
							} else {
								// create
								user.violation_info.push({
									aboutViolation: string(aboutViolation),
									date: isValidDate(date),
									tushaalText: string(tushaalText),
									tushaalFile: isId(tushaalFile)
								});
							}
							user.save((err, usr) => {
								return res.json({
									success: !err,
									sucmod: !err,
									body: req.body,
									violation: usr.violation_info,
									msg: err
										? locale("employee_routers_all.violation.edit_error")
										: locale("employee_routers_all.violation.edit_success")
								});
							});
						} else {
							let user = new CV(); // new CV
							user.user = req.body.user;
							user.company = req.company._id;
							let set = {
								aboutViolation: string(aboutViolation),
								date: isValidDate(date),
								tushaalText: string(tushaalText),
								tushaalFile: isId(tushaalFile)
							};
							if (
								user.violation_info &&
								user.violation_info.length > 0
							) {
								user.violation_info = [set];
							} else {
								user.violation_info.push(set);
							}
							user.save((err, usr) => {
								return res.json({
									success: !err,
									sucmod: !err,
									violation: usr.violation_info,
									body: req.body,
									msg: err
										? locale("employee_routers_all.violation.edit_error")
										: locale("employee_routers_all.violation.edit_success")
								});
							});
						}
					});
			} else {
				return res.json({ success: false, msg: "SYS" });
			}
		}
	);
	router.post(
		"/delete/:user/info/violation",
		(req, res, next) =>
			auth.company(req, res, next, [
				"add_violation_employee",
				"read_violation_employee"
			]),
		function (req, res) {
			const { id, user } = req.body || {};
			const reqComp = req.company || {};
			CV.findOneAndUpdate(
				{ user: isId(user), company: reqComp._id },
				{ $pull: { violation_info: { _id: isId(id) } } },
				{ new: true }
			).exec(function (err, cv) {
				if (err) {
					winsErr(req, res, "delete violation");
				}
				if (cv) {
					return res.json({
						success: !err,
						sucmod: !err,
						violation: cv.violation_info,
						msg: err ? locale("error") : locale("success")
					});
				} else {
					return res.json({
						success: false,
						sucmod: false,
						msg: locale("employee_routers_all.violation.not_found")
					});
				}
			});
		}
	);
	router.post(
		"/get/:employee/info/violation",
		(req, res, next) =>
			auth.company(req, res, next, ["read_violation_employee"]),
		function (req, res) {
			const { comp } = req.body || {};
			CV.findOne({ user: req.params.employee, company: req.company._id })
				.deepPopulate("company")
				.lean()
				.exec(function (err, violation) {
					if (err) {
						winsErr(req, res, "/get/violation");
					}
					if (violation) {
						return res.json({
							success: !err,
							violation: violation
						});
					} else {
						return res.json({ success: err });
					}
				});
		}
	);
	router.post(
		"/edit/:employee/info/role",
		(req, res, next) =>
			auth.company(req, res, next, [
				"create_employee",
				"edit_employee",
				"edit_roles",
				"read_roles"
			]),
		function (req, res) {
			const {
				role: { role }
			} = req.body || {};
			Employee.findOne({
				_id: req.params.employee,
				company: {
					$in: [...(req.subsidiaries || []), req.company._id]
				},
				status: { $nin: ["delete", "fired"] }
			}).exec(function (err, emp) {
				if (err) {
					winsErr(req, res, "Employee.findOne()");
					return res.json({
						success: false,
						msg: locale("employee_routers_all.violation.not_found")
					});
				}
				if (emp) {
					if (role === "norole") {
						//delete
						emp.role = null;
						emp.save((err, newUser) => {
							if (err) {
								winsErr(req, res, "user.save()");
							}
							return res.json({
								success: !err,
								sucmod: !err,
								body: req.body,
								role: role,
								msg: err
									? locale("employee_routers_all.role.change_error")
									: locale("employee_routers_all.role.change_success")
							});
						});
					} else {
						//set
						Roles.findOne({ _id: ObjectId(role) })
							.populate("orientation", {
								list_extra: 1,
								list_environment: 1
							})
							.exec(function (err, newRole) {
								if (err) {
									winsErr(req, res, "Roles.findOne()");
									return res.json({
										success: false,
										msg: `${locale("system_err")} 2`
									});
								}
								if (newRole) {
									let position = emp.employment || [];
									if (
										!emp.role ||
										(role || "as").toString() !==
											(emp.role || "").toString()
									) {
										position = [
											...position,
											{
												created: Date.now(),
												role: newRole._id,
												roleTitle: newRole.name,
												type: "role"
											}
										];
									}
									emp.role = newRole || emp.role;
									emp.employment = position;
									emp.save((err, newUser) => {
										if (err) {
											winsErr(req, res, "user.save()");
										}
										OrientationEmployee.countDocuments({
											employee: req.params.employee
										}).exec(function (err, count) {
											if (err) {
												winsErr(
													req,
													err,
													"Orientation.find() - edit role"
												);
												return res.json({
													success: false,
													msg: `${locale("system_err")} 3`
												});
											}
											if (!count && count === 0) {
												let orientation =
													new OrientationEmployee();
												orientation.employee =
													req.params.employee;
												orientation.company =
													req.company._id;
												orientation.list_environment = (
													(newRole.orientation || {})
														.list_environment || []
												).map((env) => {
													return {
														title: env,
														done: false
													};
												});
												orientation.list_extra = (
													(newRole.orientation || {})
														.list_extra || []
												).map((ext) => {
													return {
														title: ext,
														done: false
													};
												});
												orientation.save(
													(err, saved) => {
														if (err) {
															winsErr(
																req,
																err,
																"orientation.save() - edit role"
															);
															return res.json({
																success: false,
																msg: `${locale("system_err")} 4`
															});
														}
														return res.json({
															success: !err,
															sucmod: !err,
															body: req.body,
															role: newRole,
															msg: err
																? locale("employee_routers_all.role.change_error")
																: locale("employee_routers_all.role.change_success")
														});
													}
												);
											} else {
												return res.json({
													success: !err,
													sucmod: !err,
													body: req.body,
													role: newRole,
													msg: err
														? locale("employee_routers_all.role.change_error")
														: locale("employee_routers_all.role.change_success")
												});
											}
										});
									});
								} else {
									return res.json({
										success: false,
										msg: locale("employee_routers_all.role.change_error")
									});
								}
							});
					}
				}
			});
		}
	);
	router.post(
		"/delete/employee/:employee",
		(req, res, next) =>
			auth.company(req, res, next, [
				"create_employee",
				"delete_employee",
				"edit_employee"
			]),
		function (req, res) {
			const { written_by } = req.body;
			if (!isId(written_by)) {
				return res.json({
					success: false,
					msg: locale("employee_routers_all.reference_letter.enter_user")
				});
			}
			Employee.find({
				_id: { $in: [req.params.employee, written_by] },
				company: {
					$in: [...(req.subsidiaries || []), req.company._id]
				},
				status: { $nin: ["delete", "fired"] }
			}).exec(function (err, found) {
				if (err) {
					winsErr(req, res, "Employee.findOne");
				}
				if (found && (found || []).length === 2) {
					let emp, shouldBeWrittenBy;
					if (
						(found[0]._id || "as").toString() ===
						(req.params.employee || "").toString()
					) {
						emp = found[0];
						shouldBeWrittenBy = found[1];
					} else {
						emp = found[1];
						shouldBeWrittenBy = found[0];
					}
					if (emp.staticRole !== "lord") {
						// emp.status = 'delete';
						// emp.save((err, em) => {
						//     if(err){
						//         return res.json({success: false, msg: locale("employee_routers_all.reference_letter.fire_employee_error")});
						//     }else{
						//         return res.json({success: true, sucmod: true, employee: em, msg: locale("employee_routers_all.reference_letter.fire_employee_success")});
						//     }
						// });
						let lastIn = 0;
						for (
							let i = 0;
							i < (emp.employment || []).length;
							i++
						) {
							if (((emp.employment || [])[i] || {}).type === "in")
								lastIn = i;
						}
						let lastOut = false;
						for (
							let i = lastIn;
							i < (emp.employment || []).length;
							i++
						) {
							if (
								((emp.employment || [])[i] || {}).type === "out"
							) {
								lastOut = true;
							}
						}
						if (!lastOut) {
							emp.employment = [
								...(emp.employment || []),
								{
									type: "out"
								}
							];
							emp.status = "fired";
							emp.save((err, savedEmp) => {
								if (err) {
									winsErr(
										req,
										err,
										'/delete/employee/:employee, emp.status === "fire"'
									);
									return res.json({
										success: false,
										msg: locale("employee_routers_all.reference_letter.fire_employee_error")
									});
								}
								let reference = new Reference();
								reference.company = emp.company;
								reference.employee = {
									emp: emp._id,
									user: emp.user
								};
								reference.written_by = {
									emp: shouldBeWrittenBy._id,
									user: shouldBeWrittenBy.user
								};
								reference.save((err, savedRef) => {
									if (err) {
										winsErr(
											req,
											err,
											"/delete/employee/:employee, createRef"
										);
										return res.json({ success: true });
									}
									(
										(savedEmp.employment || [])[
											(savedEmp.employment || []).length -
												1
										] || {}
									).reference = savedRef._id;
									savedEmp.save((err, lastEmp) => {
										if (err) {
											winsErr(
												req,
												err,
												"/delete/employee/:employee, createRef"
											);
											return res.json({ success: true });
										}
										return res.json({
											success: true,
											reference:
												(
													(savedRef.written_by || {})
														.emp || "as"
												).toString() ===
												(
													req.employee._id || ""
												).toString()
													? savedRef
													: {}
										});
									});
								});
							});
						} else {
							return res.json({
								success: false,
								msg: locale("employee_routers_all.reference_letter.fire_employee_request_sent")
							});
						}
					} else {
						return res.json({
							success: false,
							msg: locale("employee_routers_all.reference_letter.not_boss")
						});
					}
				} else {
					return res.json({
						success: err,
						sucmod: err,
						msg: locale("employee_not_found")
					});
				}
			});
		}
	);
	router.post(
		"/edit/:employee/info/staticRole",
		(req, res, next) =>
			auth.company(req, res, next, [
				"create_employee",
				"edit_employee",
				"edit_roles",
				"read_roles"
			]),
		function (req, res) {
			Employee.findOneAndUpdate(
				{
					_id: req.body.emp,
					company: req.company._id,
					status: { $nin: ["delete", "fired"] }
				},
				{ staticRole: req.body.staticRole }
			).exec(function (err, emp) {
				if (err) {
					return res.json({
						success: false,
						sucmod: false,
						msg: locale("employee_routers_all.role.change_error")
					});
				}
				if (emp) {
					return res.json({
						success: true,
						sucmod: true,
						msg: locale("employee_routers_all.role.change_success"),
						staticRole: req.body.staticRole
					});
				} else {
					return res.json({
						success: false,
						msg: locale("employee_not_found")
					});
				}
			});
		}
	);
	router.post(
		"/edit/:employee/info/reward",
		(req, res, next) =>
			auth.company(req, res, next, [
				"read_reward_employee",
				"create_reward_employee"
			]),
		function (req, res) {
			const { name, date, company_name, _id, action } = req.body || {};
			if (action === "delete") {
				Employee.findOne({
					_id: req.params.employee,
					company: {
						$in: [...(req.subsidiaries || []), req.company._id]
					},
					status: { $nin: ["delete", "fired"] }
				}).exec(function (err, emp) {
					if (err) {
						winsErr(req, res, "Employee.findOne()");
					}
					if (emp) {
						User.findOneAndUpdate(
							{ _id: emp.user },
							{ $pull: { reward: { _id: isId(_id) } } },
							{ new: true }
						).exec(function (err, userReward) {
							if (err) {
								winsErr(req, res, "User.updateOne()");
							}
							if (userReward) {
								return res.json({
									success: !err,
									sucmod: !err,
									body: req.body,
									reward: userReward.reward,
									msg: err
										? locale("employee_routers_all.reward.delete_error")
										: locale("employee_routers_all.reward.delete_success")
								});
							}
						});
					}
				});
			} else {
				if (_id) {
					FindUser(req, res, (errJson, user) => {
						if (errJson) {
							return res.json(errJson);
						} else {
							if (user.reward && user.reward.length > 0) {
								user.reward.map(function (r) {
									if (
										(r._id || "aa").toString() ===
										(_id || "d").toString()
									) {
										(r.name = string(name)),
											(r.date = isValidDate(date)),
											(r.company_name =
												string(company_name));
									}
								});
							}
							user.save((err, newUser) => {
								if (err) {
									winsErr(req, res, "usr.save()");
								}
								return res.json({
									success: !err,
									sucmod: !err,
									body: req.body,
									reward: newUser.reward,
									msg: err
										? locale("employee_routers_all.reward.edit_error")
										: locale("employee_routers_all.reward.edit_success")
								});
							});
						}
					});
				} else {
					//create
					FindUser(req, res, (errJson, user) => {
						if (errJson) {
							return res.json(errJson);
						} else {
							user.reward.push({
								name: string(name),
								date: isValidDate(date),
								company_name: string(company_name)
							});
							user.save((err, newUser) => {
								if (err) {
									winsErr(req, res, "user.save()");
								}
								return res.json({
									success: !err,
									sucmod: !err,
									body: req.body,
									reward: newUser.reward,
									msg: err
										? locale("employee_routers_all.reward.edit_error")
										: locale("employee_routers_all.reward.edit_success")
								});
							});
						}
					});
				}
			}
		}
	);
	router.get("/get/break/:employee", function (req, res) {
		const { employee } = req.params || {};
		Break.find({ "employee.emp": employee, status: { $ne: "deleted" } })
			.deepPopulate(["employee.emp", "employee.user"])
			.sort({ created: "desc" })
			.exec(function (err, breaks) {
				if (err) {
					winsErr(req, res, "brk.save()");
					return res.json({
						success: false,
						sucmod: false,
						msg: locale("system_err")
					});
				}
				return res.json({ success: true, breaks: breaks });
			});
	});
	router.post(
		"/delete/break/:employee",
		(req, res, next) => auth.company(req, res, next, [], true, true),
		function (req, res) {
			const { _id } = req.body || {};
			Break.findOne({ _id: _id }).exec(function (err, re) {
				if (err) {
					winsErr(req, res, "break.Delete()");
					return res.json({
						success: false,
						sucmod: false,
						msg: `${locale("system_err")} 1`
					});
				}
				if (re.status === "pending" || re.status === "declined") {
					re.status = "deleted";
					re.save((err, reSaved) => {
						if (err) {
							winsErr(req, res, "break_delete.save()");
							return res.json({
								success: false,
								sucmod: false,
								msg: `${locale("system_err")} 2`
							});
						}
						return res.json({
							success: true,
							sucmod: true,
							msg: locale("employee_routers_all.break.delete_success"),
							id: _id
						});
					});
				} else {
					return res.json({
						success: false,
						sucmod: false,
						msg: locale("employee_routers_all.break.able_to_delete_idle_decline_request")
					});
				}
			});
		}
	);
	router.post(
		"/create/break/:employee",
		(req, res, next) => auth.company(req, res, next, [], true, true),
		function (req, res) {
			const {
				reason,
				starting_date,
				ending_date,
				numberOfDaysPaid,
				_id,
				type
			} = req.body || {};
			if (isId(_id)) {
				if (!reason || reason === "")
					return res.json({
						success: false,
						msg: locale("employee_routers_all.break.reason_empty")
					});
				if (
					!starting_date ||
					starting_date === "" ||
					!ending_date ||
					ending_date === ""
				)
					return res.json({
						success: false,
						msg: locale("employee_routers_all.break.date_wrong")
					});
				if (!type || type === "")
					return res.json({
						success: false,
						msg: locale("employee_routers_all.break.type_wrong")
					});
				let startDate, endDate;
				if (type !== "hour") {
					startDate = new Date(starting_date);
					startDate.setHours(startDate.getHours() - 8);
					endDate = new Date(ending_date);
					endDate.setDate(endDate.getDate() + 1);
					endDate.setHours(endDate.getHours() - 8);
					endDate.setMilliseconds(endDate.getMilliseconds() - 1);
				} else {
					startDate = starting_date;
					endDate = ending_date;
				}
				let date = new Date();
				Break.findOneAndUpdate(
					{ _id: _id, status: "pending" },
					{
						reason: reason || "",
						starting_date: startDate || date,
						status: "pending",
						ending_date: endDate || date,
						howManyDaysPaid: numberOfDaysPaid || 0,
						type: type || "day"
					},
					{ useFindAndModify: true }
				).exec(function (err, breaks) {
					if (err) {
						winsErr(req, res, "break.edit()");
						return res.json({
							success: false,
							msg: locale("system_err")
						});
					}
					if (breaks) {
						return res.json({
							success: true,
							sucmod: true,
							msg: locale("employee_routers_all.break.edit_success"),
							id: _id,
							status: "pending",
							reason: reason || "",
							starting_date: startDate || date,
							ending_date: endDate || date,
							number: numberOfDaysPaid || 0
						});
					} else {
						return res.json({
							success: false,
							msg: locale("employee_routers_all.break.edit_error")
						});
					}
				});
			} else {
				Break.findOne({
					"employee.emp": req.employee._id,
					status: "pending"
				}).exec(function (err, breakFound) {
					if (err) {
						winsErr(req, res, "break.findOne();");
						return res.json({
							success: false,
							sucmod: false,
							msg: locale("system_err")
						});
					}
					if (breakFound) {
						return res.json({
							success: false,
							sucmod: false,
							msg: locale("employee_routers_all.break.request_already_sent")
						});
					} else {
						if (!reason || reason === "") {
							return res.json({
								success: false,
								sucmod: false,
								msg: locale("employee_routers_all.break.reason_empty")
							});
						}
						if (
							!starting_date ||
							starting_date === "" ||
							!ending_date ||
							ending_date === ""
						) {
							return res.json({
								success: false,
								sucmod: false,
								msg: locale("employee_routers_all.break.date_wrong")
							});
						} else {
							let brk = new Break();
							let startDate, endDate;
							if (type !== "hour") {
								startDate = new Date(starting_date);
								startDate.setHours(startDate.getHours() - 8);
								endDate = new Date(ending_date);
								endDate.setDate(endDate.getDate() + 1);
								endDate.setHours(endDate.getHours() - 8);
								endDate.setMilliseconds(
									endDate.getMilliseconds() - 1
								);
							} else {
								startDate = starting_date;
								endDate = ending_date;
							}
							brk.employee = {
								emp:
									(req.params || {}).employee ||
									(req.employee || {})._id,
								user: (req.user || {})._id
							};
							brk.company = req.company._id;
							brk.starting_date = startDate || starting_date;
							brk.ending_date = endDate || ending_date;
							brk.reason = reason;
							brk.type = type || "day";
							brk.status = "pending";
							brk.howManyDaysPaid = numberOfDaysPaid || 0;
							brk.save((err, breakSaved) => {
								if (err) {
									winsErr(req, res, "brk.save()");
									return res.json({
										success: false,
										sucmod: false,
										msg: `${locale("system_err")} 1`
									});
								}
								Break.findOne({ _id: breakSaved._id }).exec(
									function (err, breakFound) {
										if (err) {
											winsErr(
												req,
												res,
												"Break.findOne()"
											);
											return res.json({
												success: false,
												sucmod: false,
												msg: `${locale("system_err")} 2`
											});
										}
										return res.json({
											success: true,
											sucmod: true,
											msg: locale("employee_routers_all.break.request_sent"),
											break: breakFound
										});
									}
								);
							});
						}
					}
				});
			}
		}
	);
	router.get("/get/vacation/:employee", function (req, res) {
		const { employee } = req.params || {};
		Vacation.find({
			"employee.emp": isId(employee),
			status: { $ne: "deleted" }
		})
			.deepPopulate(["employee.emp", "employee.user"])
			.sort({ created: "desc" })
			.exec(function (err, vacation) {
				if (err) {
					winsErr(req, res, "/get/vacation/:employee");
					return res.json({
						success: false,
						sucmod: false,
						msg: locale("system_err")
					});
				}
				return res.json({
					success: !err,
					sucmod: !err,
					empVacation: vacation
				});
			});
	});
	router.post(
		"/edit/vacation/:employee",
		(req, res, next) => auth.company(req, res, next, [], true, true),
		function (req, res) {
			const { selected_dates, id, starting_date, ending_date, rest } =
				req.body || {};
			if (rest) {
				if (selected_dates.length === 0) {
					return res
						.status(200)
						.json({ success: false, msg: locale("employee_routers_all.vacation.date_empty") });
				} else if (
					selected_dates.some((c) => {
						moment(c) < moment(starting_date) ||
							moment(c) > moment(ending_date);
					})
				) {
					return res.json({
						success: false,
						msg: locale("employee_routers_all.vacation.date_error")
					});
				} else {
					Vacation.findOneAndUpdate(
						{ _id: isId(id), status: { $in: ["idle", "pending"] } },
						{
							selected_dates: selected_dates,
							status: "pending"
						},
						{ new: true }
					).exec(function (err, vacation) {
						if (err) {
							winsErr(req, res, "Vacation.findOneAndUpdate()");
						}
						if (vacation) {
							return res.json({
								success: !err,
								sucmod: !err,
								empVacation: vacation,
								msg: locale("employee_routers_all.vacation.request_success")
							});
						} else {
							return res.json({
								success: false,
								sucmod: false,
								msg: locale("employee_routers_all.vacation.request_not_found")
							});
						}
					});
				}
			} else {
				Vacation.findOneAndUpdate(
					{ _id: isId(id), status: "idle" },
					{ status: "amrahgui" },
					{ new: true }
				).exec(function (err, vacation) {
					if (err) {
						winsErr(req, res, "Vacation.findOneAndUpdate()");
					}
					if (vacation) {
						return res.json({
							success: !err,
							sucmod: !err,
							empVacation: vacation,
							msg: locale("employee_routers_all.vacation.no_rest_success")
						});
					} else {
						return res.json({
							success: false,
							sucmod: false,
							msg: locale("employee_routers_all.vacation.request_not_found")
						});
					}
				});
			}
		}
	);
	router.get(
		"/get/standard/employee",
		(req, res, next) => auth.employee(req, res, next),
		function (req, res) {
			const {
				pageSize,
				pageNum,
				staticRole = [],
				search,
				extraProp = [],
				getAvatars = false
			} = req.query;
			const company = isId(req.query.company)
				? ObjectId(req.query.company)
				: "";
			let filter = [],
				projection = { _id: 1, last_name: 1, first_name: 1 };
			if (getAvatars) projection = { ...projection, avatar: 1 };
			let userFilter = [];
			if (search && search !== "") {
				let names = search.split(" ");
				let bothQu = {
					$regexMatch: {
						input: "$first_name",
						regex: `.*${search}.*`,
						options: "i"
					}
				};
				if (names[0] && names[1]) {
					bothQu = {
						$and: [
							{
								$regexMatch: {
									input: "$last_name",
									regex: `.*${names[0]}.*`,
									options: "i"
								}
							},
							{
								$regexMatch: {
									input: "$first_name",
									regex: `.*${names[1]}.*`,
									options: "i"
								}
							}
						]
					};
				}
				userFilter.push({
					$or: [
						{
							$regexMatch: {
								input: "$first_name",
								regex: `.*${search}.*`,
								options: "i"
							}
						},
						{
							$regexMatch: {
								input: "$last_name",
								regex: `.*${search}.*`,
								options: "i"
							}
						},
						{
							$regexMatch: {
								input: "$phone",
								regex: `.*${search}.*`,
								options: "i"
							}
						},
						{
							$regexMatch: {
								input: "$register_id",
								regex: `.*${search}.*`,
								options: "i"
							}
						},
						bothQu
					]
				});
			}
			if (typeof extraProp === "string") {
				projection = { ...projection, [extraProp]: 1 };
			} else {
				extraProp.map(function (r) {
					projection = { ...projection, [r]: 1 };
				});
			}
			let companyQu = { company: company || req.company._id };
			let lookUpQuery = [
				{
					$lookup: {
						from: "users",
						let: { id: "$user" },
						pipeline: [
							{
								$match: {
									$expr: {
										$and: [
											{ $eq: ["$_id", "$$id"] },
											...userFilter
										]
									}
								}
							},
							{ $project: projection }
						],
						as: "user"
					}
				},
				{ $unwind: "$user" }
			];
			if (req.query.subsidiaries) {
				if (company === "") {
					companyQu = {
						company: {
							$in: [req.company._id, ...(req.subsidiaries || [])]
						}
					};
				} else {
					companyQu = { company: company };
				}
				lookUpQuery.push(
					{
						$lookup: {
							from: "companies",
							let: { id: "$company" },
							pipeline: [
								{
									$match: {
										$expr: {
											$and: [{ $eq: ["$_id", "$$id"] }]
										}
									}
								},
								{
									$project: {
										name: 1,
										domain: 1
									}
								}
							],
							as: "company"
						}
					},
					{
						$set: {
							company: { $arrayElemAt: ["$company", 0] }
						}
					}
				);
			}
			if (typeof staticRole === "string") {
				filter = [
					{ status: { $nin: ["delete", "fired"] } },
					companyQu,
					{ staticRole: staticRole }
				];
			} else {
				/* Бусад router-уудад нөлөөлөх магадлалтай */
				filter = [
					{ status: { $nin: ["delete", "fired"] } },
					companyQu,
					{ staticRole: { $in: staticRole } }
				];
				if (staticRole.length === 0) {
					filter.pop();
				}
			}
			async.parallel(
				{
					emp: function (cb) {
						if (pageSize && pageNum && pageSize !== 0) {
							Employee.aggregate([
								{ $match: { $and: filter } },
								...(lookUpQuery || []),
								{
									$skip:
										parseInt(pageSize) * parseInt(pageNum)
								},
								{ $limit: parseInt(pageSize) }
							]).exec(function (err, emp) {
								getAvatars
									? getAvatar(req, res, emp, (emps) => {
											cb(err, emps);
									  })
									: cb(err, emp);
							});
						} else {
							Employee.aggregate([
								{ $match: { $and: filter } },
								...(lookUpQuery || [])
							]).exec(function (err, emp) {
								getAvatars
									? getAvatar(req, res, emp, (emps) => {
											cb(err, emps);
									  })
									: cb(err, emp);
							});
						}
					},
					count: function (cb) {
						Employee.aggregate([
							{ $match: { $and: filter } },
							...(lookUpQuery || [])
						]).exec(function (err, emp) {
							cb(err, (emp || []).length);
						});
					}
				},
				function (err, data) {
					if (err) {
						winsErr(
							req,
							res,
							"employee.find() - standard - pagination"
						);
						return res.json({
							success: false,
							msg: locale("system_err")
						});
					}
					if (data) {
						return res.json({
							success: true,
							employees: data.emp || [],
							all: data.count || 0
						});
					} else {
						return res.json({
							success: false,
							msg: locale("employee_not_found")
						});
					}
				}
			);

			// let found = [];
			// const requirements = ['lord', 'chairman', 'hrManager', 'attendanceCollector', 'employee'];
			// const requested = (req.query || {});
			// (requirements || []).map(requirement => {
			//     if(requested[requirement] && requested[requirement] === 'true'){
			//         found.push(requirement);
			//     }
			// });
			// if((found || []).length === 0){
			//     return res.json({success: false, msg: 'Олох хүмүүсийг оруулах ёстой'});
			// }
			// if((requested || {}).pageSize || (requested || {}).pageNumber){
			//     if((requested || {}).pageSize > 0 && (requested || {}).pageNumber >= 0) {
			//         async.parallel({
			//             count: function(cb){
			//                 Employee.count({status: {$nin: ['delete', 'fired']}, company: (req.company || {})._id, staticRole: {$in: found}}, function(err, empC){
			//                     cb(err, empC)
			//                 })
			//             },
			//             employees: function(cb){
			//                 Employee.find({status: {$nin: ['delete', 'fired']}, company: (req.company || {})._id, staticRole: {$in: found}}).limit(pageSize).skip(pageSize * pageNum).deepPopulate('user').lean().exec(function(err, emp){
			//                     cb(err, emp)
			//                 })
			//             }
			//         }, function(err, data){
			//             if(err) {
			//                 winsErr(req, res, 'employee.find() - standard - pagination')
			//             }
			//             if(data) {
			//                 return res.json({success: success, employees: data.employees, all: data.count})
			//             } else {
			//                 return res.json({success: false, msg: locale("employee_not_found")})
			//             }
			//         })
			//     }else{
			//         return res.json({success: false, msg: 'Хуудасны тоо болон хэмжээг зөв оруулна уу.'});
			//     }
			// }else{
			//     Employee.find({status: {$nin: ['delete', 'fired']}, company: (req.company || {})._id, staticRole: {$in: found}}).deepPopulate('user').exec(function(err, emp){
			//        if(err){
			//            winsErr(req, res, 'employee.find() - standard');
			//            return res.json({success: false, msg: 'Системийн алдаа гарлаа'});
			//        }else{
			//            if(emp){
			//                return res.json({success: true, employees: emp})
			//            }else{
			//                return res.json({success: false, msg: locale("employee_not_found")});
			//            }
			//        }
			//     });
			// }
		}
	);
	router.get(
		"/get/timetable/employee",
		(req, res, next) =>
			auth.company(req, res, next, ["deal_with_timetable"]),
		function (req, res) {
			const { _id } = req.query;
			if (_id) {
				Timetable.findOne({
					_id: _id,
					status: { $ne: "archived" },
					company: req.company._id
				}).exec(function (err, time) {
					if (err) {
						winsErr(
							req,
							res,
							"Timetable.find() - workerSingle - employee"
						);
						return res.json({
							success: false,
							msg: locale("system_err")
						});
					}
					if (time) {
						return res.json({ success: true, timetable: time });
					} else {
						return res.json({
							success: false,
							msg: locale("employee_routers_all.timetable.not_found")
						});
					}
				});
			} else {
				return res.json({ success: true, timetable: {} });
			}
		}
	);
	router.post(
		"/change/timetable/employee",
		(req, res, next) =>
			auth.company(req, res, next, ["deal_with_timetable"]),
		function (req, res) {
			const { timetableId, employeeId, deleteTim = false } = req.body;
			if (deleteTim) {
				Employee.findOneAndUpdate(
					{ status: { $nin: ["delete", "fired"] }, _id: employeeId },
					{ timetable: null },
					{ new: true }
				).exec(function (err, emp) {
					if (err) {
						winsErr(
							req,
							res,
							"employee.find() - workerSingle - employee"
						);
						return res.json({
							success: false,
							msg: `${locale("system_err")} 1`
						});
					}
					if (emp) {
						return res.json({ success: true, timetable: {} });
					} else {
						return res.json({
							success: false,
							msg: locale("employee_not_found")
						});
					}
				});
			} else {
				Employee.findOneAndUpdate(
					{ status: { $nin: ["delete", "fired"] }, _id: employeeId },
					{ timetable: timetableId },
					{ new: true }
				).exec(function (err, emp) {
					if (err) {
						winsErr(
							req,
							res,
							"employee.find() - workerSingle - employee"
						);
						return res.json({
							success: false,
							msg: `${locale("system_err")} 1`
						});
					}
					if (emp) {
						Timetable.findOne({
							_id: timetableId,
							status: "active",
							company: req.company._id
						}).exec(function (err, timetable) {
							if (err) {
								winsErr(
									req,
									res,
									"timetable.find() - workerSingle - employee"
								);
								return res.json({
									success: false,
									msg: `${locale("system_err")} 2`
								});
							}
							if (timetable) {
								return res.json({
									success: true,
									timetable: timetable
								});
							} else {
								return res.json({
									success: false,
									msg: locale("employee_routers_all.timetable.not_found")
								});
							}
						});
					} else {
						return res.json({
							success: false,
							msg: locale("employee_not_found")
						});
					}
				});
			}
		}
	);
	router.get(
		"/get/:user/info/reward",
		(req, res, next) =>
			auth.company(req, res, next, ["read_reward_employee"]),
		function (req, res) {
			CV.findOne({
				user: req.params.user,
				company: req.company._id
			}).exec(function (err, cv) {
				if (err) {
					winsErr(req, res, "cv.findOne");
					return res.json({
						success: false,
						sucmod: false,
						msg: locale("system_err")
					});
				}
				return res.json({ success: true, rewards: (cv || {}).reward });
			});
		}
	);
	router.post(
		"/edit/user/:user/info/reward",
		(req, res, next) =>
			auth.company(req, res, next, [
				"read_reward_employee",
				"create_reward_employee"
			]),
		function (req, res) {
			const { id, reward_date, reward_name, reward_ground } =
				req.body || {};
			CV.findOne({
				user: req.params.user,
				company: req.company._id
			}).exec(function (err, cv) {
				if (err) {
					winsErr(req, res, "cv.findOne");
					return res.json({
						success: false,
						sucmod: false,
						msg: locale("system_err")
					});
				}
				if (cv) {
					//update CV
					if (id && isId(id)) {
						// edit reward
						(cv.reward || []).map((c) => {
							if (c._id.toString() !== id.toString()) {
								return c;
							} else {
								c.date = isValidDate(reward_date);
								c.reward_name = string(reward_name);
								c.reward_ground = string(reward_ground);
								return c;
							}
						});
					} else {
						// new reward
						cv.reward.push({
							date: isValidDate(reward_date),
							reward_name: string(reward_name),
							reward_ground: string(reward_ground)
						});
					}
					cv.save((err, newCV) => {
						return res.json({
							success: !err,
							sucmod: !err,
							rewards: newCV.reward,
							msg: err ? locale("error") : locale("success")
						});
					});
				} else {
					// new CV
					let cv = new CV();
					cv.user = isId(req.params.user);
					cv.company = req.company._id;
					cv.reward.push({
						date: isValidDate(reward_date),
						reward_name: string(reward_name),
						reward_ground: string(reward_ground)
					});
					cv.save((err, newCV) => {
						return res.json({
							success: !err,
							sucmod: !err,
							rewards: newCV.reward,
							msg: err
								? locale("employee_routers_all.reward.edit_error")
								: locale("employee_routers_all.reward.edit_success")
						});
					});
				}
			});
		}
	);
	router.post(
		"/delete/:user/info/reward",
		(req, res, next) =>
			auth.company(req, res, next, [
				"read_reward_employee",
				"create_reward_employee"
			]),
		function (req, res) {
			const { id } = req.body || {};
			CV.findOneAndUpdate(
				{ user: req.params.user, company: req.company._id },
				{ $pull: { reward: { _id: isId(id) } } },
				{ new: true }
			).exec(function (err, cv) {
				if (err) {
					winsErr(req, res, "cv.findOne");
					return res.json({
						success: false,
						sucmod: false,
						msg: locale("system_err")
					});
				}
				if (cv) {
					return res.json({
						success: true,
						sucmod: true,
						rewards: cv.reward,
						msg: locale("success")
					});
				} else {
					return res.json({
						success: false,
						sucmod: false,
						msg: locale("employee_routers_all.reward.not_found")
					});
				}
			});
		}
	);
	router.get(
		"/get/salary/employee/:employee",
		(req, res, next) =>
			auth.company(req, res, next, ["read_salary", "edit_salary"], true),
		function (req, res) {
			const { start, end, _id } = req.query;
			const date_start = new Date(start);
			const date_end = new Date(end);
			const new_date = new Date();
			new_date.setMilliseconds(0);
			new_date.setSeconds(0);
			new_date.setMinutes(0);
			new_date.setHours(0);
			new_date.setHours(new_date.getHours() + 8);
			new_date.setDate(1);
			Salary.find({
				$and: [
					{ "employee.emp": _id || req.employee._id },
					{
						$and: [
							{ year_month: { $gte: date_start || new_date } },
							{ year_month: { $lte: date_end || new_date } }
						]
					},
					{ company: req.company._id },
					{ status: "approved" }
				]
			})
				.sort({ year_month: -1 })
				.exec(function (err, salaries) {
					if (err) {
						winsErr(req, res, "salry.find() - employee");
						return res.json({ success: true, salaries: [] });
					}
					return res.json({ success: true, salaries: salaries });
				});
		}
	);
	router.get(
		"/get/lord",
		(req, res, next) => auth.company(req, res, next, []),
		function (req, res) {
			Employee.findOne(
				{
					status: "active",
					staticRole: "lord",
					company: req.company._id
				},
				{ _id: 1, user: 1 }
			)
				.lean()
				.exec(function (err, lord) {
					if (err) {
						winsErr(req, err, "/get/lord - find employee");
						return res.json({ success: true, lord: {} });
					}
					User.findOne(
						{ _id: (lord || {}).user, status: "active" },
						{ first_name: 1, last_name: 1 }
					)
						.lean()
						.exec(function (err, user) {
							if (err) {
								winsErr(req, err, "/get/lord - find user");
								return res.json({ success: true, lord: {} });
							}
							lord.user = user;
							return res.json({ success: true, lord: lord });
						});
				});
		}
	);
	router.post(
		"/get/employee/from/role",
		(req, res, next) => auth.company(req, res, next, []),
		function (req, res) {
			const { role, staticRole } = req.body;
			let searchQu = {
				status: { $nin: ["delete", "fired"] },
				company: req.company._id
			};
			if (typeof role === "string")
				searchQu = {
					...searchQu,
					role: role,
					staticRole: { $ne: "attendanceCollector" }
				};
			// else searchQu = {...searchQu, role: {$in: role} };
			if (typeof staticRole === "string")
				searchQu = { ...searchQu, staticRole: staticRole };
			// else searchQu = {...searchQu, staticRole: {$in: staticRole}};
			Employee.find(searchQu, { user: 1, _id: 1 })
				.lean()
				.exec(function (err, employees) {
					if (err) {
						winsErr(
							req,
							err,
							"/get/employee/from/role - find employees"
						);
						return res.json({
							success: false,
							msg: `${locale("system_err")} 1`
						});
					}
					if (employees && (employees || []).length > 0) {
						let temp = (employees || []).map(
							(employee) => employee.user
						);
						User.find(
							{ _id: { $in: temp }, status: "active" },
							{ first_name: 1, last_name: 1, register_id: 1 }
						)
							.lean()
							.exec(function (err, users) {
								if (err) {
									winsErr(
										req,
										err,
										"/get/employee/from/role - find users"
									);
									return res.json({
										success: false,
										msg: `${locale("system_err")} 2`
									});
								}
								if (users && (users || []).length) {
									let parentOfSearch = "";
									if (role && role !== "") {
										parentOfSearch = role;
									} else {
										parentOfSearch = staticRole;
									}
									employees = (employees || []).map(
										(employee) => {
											let tempUser = {};
											(users || []).map((user) => {
												if (
													(
														employee.user || "as"
													).toString() ===
													(user._id || "").toString()
												) {
													tempUser = user;
												}
											});
											return {
												...employee,
												user: tempUser,
												parent: parentOfSearch
											};
										}
									);
									return res.json({
										success: true,
										employees: employees,
										parent: parentOfSearch
									});
								} else {
									return res.json({
										success: false,
										msg: locale("user_not_found")
									});
								}
							});
					} else {
						return res.json({
							success: false,
							msg: locale("employee_not_found")
						});
					}
				});
		}
	);

	//IMPORT EMPLOYEE
	router.post("/import/excel/employee", function (req, res) {
		excelImport(req, res, function (err) {
			if (err) {
				return res.json({ success: false });
			}
			let data = importExcel(req.file.path);
			return res.json({
				success: true,
				data,
				sucmod: true,
				msg: locale("employee_routers_all.import.success")
			});
		});
	});
	router.post(
		"/import/employees",
		(req, res, next) => auth.companyAdministrator(req, res, next),
		function (req, res) {
			// console.log("/import/employees ->");
			function transformReg(str) {
				str = (str || "").toLowerCase();
				return String(str)
					.replace(/\а/g, "a")
					.replace(/\б/g, "b")
					.replace(/\в/g, "v")
					.replace(/\г/g, "g")
					.replace(/\д/g, "d")
					.replace(/\е/g, "ye")
					.replace(/\ё/g, "yo")
					.replace(/\ж/g, "j")
					.replace(/\з/g, "z")
					.replace(/\и/g, "i")
					.replace(/\й/g, "ii")
					.replace(/\к/g, "k")
					.replace(/\л/g, "l")
					.replace(/\м/g, "m")
					.replace(/\н/g, "n")
					.replace(/\о/g, "o")
					.replace(/\ө/g, "u")
					.replace(/\п/g, "p")
					.replace(/\р/g, "r")
					.replace(/\с/g, "s")
					.replace(/\т/g, "t")
					.replace(/\у/g, "u")
					.replace(/\ү/g, "u")
					.replace(/\ф/g, "f")
					.replace(/\х/g, "h")
					.replace(/\ц/g, "ts")
					.replace(/\ч/g, "ch")
					.replace(/\ш/g, "sh")
					.replace(/\щ/g, "shts")
					.replace(/\ъ/g, "ht")
					.replace(/\ы/g, "ji")
					.replace(/\ь/g, "zt")
					.replace(/\э/g, "e")
					.replace(/\ю/g, "yu")
					.replace(/\я/g, "ya");
			}
			const { data } = req.body;
			if (
				!data ||
				(data && data.length === 0) ||
				(data && Object.keys((data || [])[0] || {}).length === 0)
			) {
				return res.json({ success: false, msg: locale("employee_routers_all.import.empty") });
			}
			let users = new Array();
			let noRegisterDocument = [];
			let duplicatedRegisterId = [];
			// console.dir(data, { maxArrayLength: null });
			// console.log("data::", data);
			(data || []).map(function (dat, idx) {
				if (
					dat["Регистрийн дугаар"] &&
					dat["Регистрийн дугаар"].length === 10 &&
					dat["Нэр"] &&
					dat["Овог"]
				) {
					if (
						!users.some(
							(r) => r.register_id === dat["Регистрийн дугаар"]
						)
					) {
						// console.log(
						// 	"yes *** idx::",
						// 	idx,
						// 	" Регистрийн дугаар length::",
						// 	dat["Регистрийн дугаар"].length
						// );
						users.push({
							first_name: (dat["Нэр"] || '').trim(),
							last_name: (dat["Овог"] || '').trim(),
							register_id: (dat["Регистрийн дугаар"] || '').trim().toLowerCase(),
							phone: dat["Утасны дугаар"],
							birthday: Date(dat["Төрсөн он, сар, өдөр"] || ""),
							username: transformReg((dat["Регистрийн дугаар"] || '').trim()),
							password: bcrypt.hashSync(
								dat["Утасны дугаар"]
									? dat["Утасны дугаар"]
									: "12312312"
							),
							status: "active"
						});
					} else {
						// console.log(
						// 	"no *** idx::",
						// 	idx,
						// 	" Регистрийн дугаар length::",
						// 	dat["Регистрийн дугаар"].length
						// );
						duplicatedRegisterId.push(dat);
					}
				} else {
					// console.log(
					// 	"no *** idx::",
					// 	idx,
					// 	" Регистрийн дугаар length::",
					// 	dat["Регистрийн дугаар"].length
					// );
					noRegisterDocument.push(dat);
				}
			});
			// User.insertMany(users, {rawResult: true, lean: true, ordered: true}, function(err, saved){
			let register_ids = [];
			users.map(user => {
				let reg = new RegExp(`^${user.register_id}$`, "i");
				register_ids.push(reg);
			});
			// console.log(users.length);
			if(!users.length){
				return res.json({success: false, msg: 'Ажилчид байхгүй байна. Excel-ийн баганы нэрийг дахин шалгана уу.'});
			}
			User.find({status: 'active', register_id: {$in: register_ids}}).exec((err, found) => {
				if (err) {
					winsErr(req, err, '/import/employees - user find registers');
					return res.json({success: false, msg: 'Системийн алдаа 10'});
				}
				if((found || []).length > 0)
					users = users.filter(user => !found.some(fo => fo.register_id === user.register_id));
				User.insertMany(
					users,
					{ rawResult: true, ordered: false },
					function (err, saved) {
						if (err) {
							winsErr(req, err, '/import/employees - user insertMany');
							// console.dir(err.insertedDocs, { maxArrayLength: null });
							// return res.json({
							//     success: true,
							//     sucmod: true
							// });
						}
						let emps = new Array();
						if(saved){
							(Object.values(saved.insertedIds || {}) || []).map((ids) =>
								emps.push({
									user: ids,
									company: req.company._id,
									status: "active",
									employment: { type: "in", date: Date.now() }
								})
							);
						}else{
							(err.insertedDocs || []).map((ids) =>{
								if(ids._doc){
									emps.push({
										user: ObjectId(ids._doc._id).toString(),
										company: req.company._id,
										status: "active",
										employment: { type: "in", date: Date.now() }
									})
								}
							});
						}
						if(emps.length > 0){
							Employee.insertMany(
								emps,
								{ rawResult: true, ordered: false },
								function (err, emps) {
									if (err) {
										winsErr(req, err, '/import/employees - employee insertMany');
										// console.dir(err, { maxArrayLength: null });
										return res.json({
											success: true,
											sucmod: true
										});
									}
									return res.json({
										success: true,
										sucmod: true,
										duplicatedRegisterId: duplicatedRegisterId,
										noRegisterDocument: noRegisterDocument
									});
								}
							);
						} else {
							return res.json({success: true});
						}
					}
				);
			});
		}
	);

	router.post(
		"/del/dele/delet/delete",
		(req, res, next) => auth.companyAdministrator(req, res, next),
		function (req, res) {
			let arrayRegister =
                [
                    "рм96051405",
                    "ух94031676",
                    "йс93033110",
                    "сю75111969",
                    "цд86071575",
                    "уу95103021",
                    "ою94092055",
                    "ос02251718",
                    "ух97090210",
                    "на91022136",
                    "ух90071371",
                    "ок84012203",
                    "нз90010478",
                    "ою90020238",
                    "ир91121011",
                    "ию92100305",
                    "хж73051219",
                    "су99100407",
                    "уз94030411",
                    "йо99041016",
                    "нэ98061214",
                    "нч88122810",
                    "ух91051111",
                    "од87070215",
                    "хд84032211",
                    "уи95042716",
                    "нч93021317",
                    "йн86062301",
                    "ув93111711",
                    "не94072017",
                    "чм81090571",
                    "зд85030300",
                    "ух98012733",
                    "хи84092073",
                    "чж79070805",
                    "ди00273108",
                    "рп00272716",
                    "уг54051531",
                    "зм74091006",
                    "ию03302121",
                    "уз96080117",
                    "уп98062839",
                    "ою98050611",
                    "пе90051204",
                    "рр93010218",
                    "уш94071835",
                    "уз98020821",
                    "чг78082608",
                    "уи98010315",
                    "шу01221715",
                    "шу92121316",
                    "ою90070718",
                    "их85032611",
                    "нь93062513",
                    "цв79080260",
                    "уз00311492",
                    "дл93100818",
                    "ав88040418",
                    "ча86052681",
                    "та67021233",
                    "йю81080301",
                    "ух92030331",
                    "не96122913",
                    "уп91071019",
                    "рэ90091218",
                    "уи91100661",
                    "цз87070401",
                    "по86071001",
                    "кю79042368",
                    "йл91070813",
                    "ою98082316",
                    "иэ98010811",
                    "нб79102700",
                    "ух90052774",
                    "те87102772",
                    "те92091307",
                    "еп96040511",
                    "мх00250505",
                    "вю98111205",
                    "дл96051709",
                    "дл95051207",
                    "ас83110302",
                    "ча81063003",
                    "рх90120211",
                    "ук99051882",
                    "фм82113061",
                    "нб95041109",
                    "жг96032409",
                    "пк97072803",
                    "ук94052215",
                    "оа93052711",
                    "ше78103113",
                    "ос00251210",
                    "ую93010119",
                    "ою88011010",
                    "иэ82051104",
                    "аю89060593",
                    "уг90102017",
                    "ув88091811",
                    "сэ88091709",
                    "пб95072609",
                    "ир95021519",
                    "ов85052105",
                    "уз94092519",
                    "дю97021611",
                    "вю19940731",
                    "он78082773",
                    "хд79072800",
                    "ос68121711",
                    "ою97032924",
                    "йс91061212",
                    "зл88032305",
                    "дл96110201",
                    "нч02261614",
                    "хд86031011",
                    "хд83061619",
                    "ок85050805",
                    "ит96020228",
                    "ух89040603",
                    "уу89022403",
                    "дг88100200",
                    "ик91012419",
                    "цв77121219",
                    "ос99022613",
                    "рп91121215",
                    "хк81030519",
                    "мх89102618",
                    "ич91081905",
                    "уп01242958",
                    "па99010208",
                    "гм82100712",
                    "фб98081385",
                    "ав97012713",
                    "рф93062610",
                    "йс91031535",
                    "ум89090714",
                    "ою88011010",
                    "нл94040610",
                    "жю02262028",
                    "уи93111130",
                    "тк97031710",
                    "вп95031910",
                    "ем98022559",
                    "мю94091311",
                    "аж93010401",
                    "дю88101881",
                    "цб70051001",
                    "тз80102314",
                    "дк01243020",
                    "дк01251300",
                    "ук92081766",
                    "фм84031217",
                    "аю94122114",
                    "ук91050109",
                    "ух90092630",
                    "иа93010615",
                    "уз90051328",
                    "ой78030302",
                    "чй85061260",
                    "пз91032308",
                    "ча68050137",
                    "дж93120741",
                    "вю91010128",
                    "вэ84062019",
                    "ою97122011",
                    "жэ58050614",
                    "йю87111308",
                    "оо91112715",
                    "ая98033011",
                    "рй01322800",
                    "гп93031700",
                    "пю86031889",
                    "чо80021415",
                    "уу99042214",
                    "ою89033031"
                ];
			// let regexedSht = [];
			// arrayRegister.map(function (r) {
			// 	regexedSht.push(new RegExp(".*"+r+".*", "i"));
			// });
			// User.deleteMany({created:{$gte:new Date('2021-11-04T16:00:00.399+00:00')}}, function (err, data) {
			// User.deleteMany({register_id:{$in:arrayRegister}}, function (err, data) {
			//     if(err){
			// return res.json({ success: false });
			// } else {
			    return res.json({success:true});
			// }
			// });
		}
	);
};

const importExcel = (file) => {
	let excel = XLSX.readFile(file, { codepage: 65001, cellDates: true });
	let jsons = utils.sheet_to_json(excel.Sheets[excel.SheetNames[0]], {
		defval: ""
	});
	return JSON.parse(JSON.stringify(jsons));
};
