import winston from "winston";
import async from "async";
import { check, validationResult } from "express-validator/check";
import { matchedData } from "express-validator/filter";
import auth from "../../auth";
import Asset from "../../models/Asset";
import SubAsset from "../../models/SubAsset";
import {locale} from "../../lang";
let slug = require("slug");

module.exports = function (router) {
	router.get("/getAsset", auth.company, function (req, res) {
		let searchQu = { status: "active", company: req.company._id };
		if (req.query.search && req.query.search !== "") {
			let regex = new RegExp(".*" + req.query.search + ".*", "i");
			searchQu = {
				$and: [{ status: "active" }, { $or: [{ title: regex }] }]
			};
		}
		async.parallel(
			[
				function (callback) {
					Asset.find(searchQu)
						.sort({ created: -1 })
						.skip(
							parseInt(req.query.pageNum) *
								parseInt(req.query.pageSize)
						)
						.limit(parseInt(req.query.pageSize))
						.deepPopulate(["created_by"])
						.lean()
						.exec(function (err, result) {
							async.map(
								result,
								function (item, cb) {
									SubAsset.find({
										asset: item._id,
										status: "active"
									})
										.sort({ created: -1 })
										.lean()
										.exec(function (errT, subCat) {
											cb(err || errT, {
												...item,
												child: subCat || []
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
					Asset.count(searchQu).exec(function (err, result) {
						callback(err, result);
					});
				}
			],
			function (err, results) {
				if (err) {
					winston.error("/api/admin/getAsset", err);
					return res
						.status(200)
						.json({ success: false, msg: locale("system_err"), err });
				}
				return res.status(200).json({
					success: true,
					assets: results[0] || [],
					all: results[1] || 0
				});
			}
		);
	});
	router.post(
		"/submitAsset",
		(req, res, next) => auth.company(req, res, next, ['asset']),
		[
			check("_id"),
			check("title").not().isEmpty().withMessage(locale("name_empty")).trim()
		],
		function (req, res) {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res
					.status(200)
					.json({ success: false, msg: errors.array()[0].msg });
			}
			let data = matchedData(req);
			if (data._id) {
				//update asset
				Asset.updateOne(
					{ _id: data._id, company: req.company._id },
					{
						title: data.title
					},
					function (err, result) {
						if (err) {
							winston.error("/api/admin/submitAsset", err);
							return res.status(200).json({
								success: false,
								msg: locale("system_err")
							});
						}
						if (result.nModified) {
							return res.status(200).json({
								success: true,
								_id: data._id,
								data: data
							});
						} else {
							return res
								.status(200)
								.json({ success: false, msg: locale("error") });
						}
					}
				);
			} else {
				//new asset
				let holdSlug = slug(data.title);
				let regex = new RegExp("^" + holdSlug, "i");
				Asset.find({ slug: regex }, function (err, slugs) {
					if (err) {
						winston.error("/api/admin/submitAsset", err);
						return res.status(200).json({
							success: false,
							msg: locale("system_err"),
							err
						});
					}
					if (slugs && slugs.length > 0) {
						holdSlug = `${holdSlug}-${slugs.length}`;
					}
					let asset = new Asset();
					asset.slug = holdSlug;
					asset.title = data.title;
					asset.created_by = req.user._id;
					asset.company = req.company._id;
					asset.save(function (err) {
						if (err) {
							winston.error("/admin/api/submitAsset", err);
							return res.status(200).json({
								success: false,
								msg: locale("system_err")
							});
						}
						return res.status(200).json({
							success: true,
							data: { ...asset._doc, created_by: req.user },
							_id: data._id
						});
					});
				});
			}
		}
	);
	router.post(
		"/deleteAsset",
		(req, res, next) => auth.company(req, res, next, ['asset']),
		[check("_id").not().isEmpty().withMessage(locale("error")).trim()],
		function (req, res) {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res
					.status(200)
					.json({ success: false, msg: errors.array()[0].msg });
			}
			let data = matchedData(req);
			if (data._id) {
				SubAsset.updateMany(
					{ asset: data._id, company: req.company._id },
					{ $set: { status: "delete" } }
				).exec(function (err, del) {
					if (err) {
						winston.error("/api/admin/deleteAsset", err);
						return res.status(200).json({
							success: false,
							msg: locale("error_retry"),
							_id: data._id
						});
					}
					Asset.updateOne(
						{ _id: data._id, company: req.company._id },
						{ status: "delete" },
						function (err, result) {
							if (err) {
								winston.error("/api/admin/deleteAsset", err);
								return res.status(200).json({
									success: false,
									msg: locale("system_err"),
									_id: data._id
								});
							}
							if (result.nModified) {
								return res.status(200).json({
									success: true,
									sucmod: true,
									msg: locale("action_success"),
									_id: data._id
								});
							} else {
								return res.status(200).json({
									success: false,
									msg: locale("action_failed"),
									_id: data._id
								});
							}
						}
					);
				});
			} else {
				return res.status(200).json({ success: false, msg: locale("error") });
			}
		}
	);
	router.post(
		"/submitSubAsset",
		(req, res, next) => auth.company(req, res, next, ['asset']),
		[
			check("_id"),
			check("asset"),
			check("title").not().isEmpty().withMessage(locale("name_empty")).trim()
		],
		function (req, res) {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res
					.status(200)
					.json({ success: false, msg: errors.array()[0].msg });
			}
			let data = matchedData(req);
			if (data.asset && data.asset._id) {
				if (data._id) {
					//update sub asset
					SubAsset.updateOne(
						{ _id: data._id, company: req.company._id },
						{
							title: data.title
						},
						function (err, result) {
							if (err) {
								winston.error("/api/admin/submitSubAsset", err);
								return res.status(200).json({
									success: false,
									msg: locale("system_err")
								});
							}
							if (result.nModified) {
								return res.status(200).json({
									success: true,
									_id: data._id,
									data: { ...data, asset: data.asset._id }
								});
							} else {
								return res
									.status(200)
									.json({ success: false, msg: locale("error") });
							}
						}
					);
				} else {
					//new sub asset
					let holdSlug = slug(data.title);
					let regex = new RegExp("^" + holdSlug, "i");
					SubAsset.find({ slug: regex }, function (err, slugs) {
						if (err) {
							winston.error("/api/admin/submitAsset", err);
							return res.status(200).json({
								success: false,
								msg: locale("system_err"),
								err
							});
						}
						if (slugs && slugs.length > 0) {
							holdSlug = `${holdSlug}-${slugs.length}`;
						}
						let subAsset = new SubAsset();
						subAsset.slug = holdSlug;
						subAsset.title = data.title;
						subAsset.asset = data.asset._id;
						subAsset.created_by = req.user._id;
						subAsset.company = req.company._id;
						subAsset.save(function (err) {
							if (err) {
								winston.error("/admin/api/submitSubAsset", err);
								return res.status(200).json({
									success: false,
									msg: locale("system_err")
								});
							}
							return res.status(200).json({
								success: true,
								data: {
									...subAsset._doc,
									created_by: req.user
								},
								_id: data._id
							});
						});
					});
				}
			} else {
				return res.status(200).json({
					success: false,
					msg: locale("error_retry")
				});
			}
		}
	);
	router.post(
		"/deleteSubAsset",
		(req, res, next) => auth.company(req, res, next, ['asset']),
		[
			check("_id").not().isEmpty().withMessage(locale("error")).trim(),
			check("catId").not().isEmpty().withMessage(locale("error")).trim()
		],
		function (req, res) {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res
					.status(200)
					.json({ success: false, msg: errors.array()[0].msg });
			}
			let data = matchedData(req);
			if (data._id && data.catId) {
				SubAsset.findOneAndUpdate(
					{ _id: data._id, company: req.company._id },
					{ $set: { status: "delete" } }
				).exec(function (err, del) {
					if (err) {
						winston.error("/api/admin/deleteAsset", err);
						return res.status(200).json({
							success: false,
							msg: locale("error_retry"),
							_id: data._id
						});
					}
					return res.status(200).json({
						success: true,
						sucmod: true,
						msg: locale("action_success"),
						_id: data._id,
						catId: data.catId
					});
				});
			} else {
				return res.status(200).json({ success: false, msg: locale("error") });
			}
		}
	);
	router.get("/getSubAssets", auth.company, function (req, res) {
		SubAsset.find({status: 'active'})
			.deepPopulate(["asset"])
			.lean()
			.exec(function (err, result) {
				if (err) {
					winston.error("/getSubAssets", err);
					return res
						.status(200)
						.json({ success: false, msg: locale("system_err"), err });
				}
				return res
					.status(200)
					.json({
						success: true,
						assets: result
					});
			});
	});
};
