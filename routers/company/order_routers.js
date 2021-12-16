import winston from "winston";
import async from "async";
import { check, validationResult } from "express-validator/check";
import { matchedData } from "express-validator/filter";
import Order from "../../models/Order";
import auth from "../../auth";
import Supply from "../../models/Supply";
import SubProduct from "../../models/SubProduct";
import {locale} from "../../lang";
let slug = require("slug");

module.exports = function (router) {
	router.get(
		"/getOrders",
		auth.company,
		[
			check("companyID")
				.not()
				.isEmpty()
				.withMessage(locale("order_routers_all.locationError.insert"))
				.isMongoId()
				.withMessage(locale("order_routers_all.idError.insert"))
		],
		(req, res) => {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res
					.status(200)
					.json({ success: false, msg: errors.array()[0].msg });
			}
			const companyID = req.company._id;
			Order.find({ company: companyID }).exec((err, foundWh) => {
				if (err) {
					winston.error("/getOrders error", err);
					return res.json({
						success: false,
						msg: locale("system_err")
					});
				} else {
					return res.json({ success: true, data: foundWh });
				}
			});
		}
	);
	router.get("/getOrderSingle", auth.company, (req, res) => {
		if (req.query && Object.keys(req.query).length > 0) {
			const { orderID } = req.query;
			Order.findOne({ _id: orderID }).exec((err, foundWh) => {
				if (err) {
					winston.error("/getOrderSingle error", err);
					return res.json({
						success: false,
						msg: locale("system_err")
					});
				} else {
					return res.json({ success: true, data: foundWh });
				}
			});
		} else {
			return res.json({ success: false, msg: locale("insert_value") });
		}
	});
	router.post("/submitOrder", (req, res, next) => auth.company(req, res, next, ['restock']), (req, res) => {
		let { supplies } = req.body;
		if (supplies && req.company._id) {
			Order.find({
				status: { $ne: "delete" },
				company: req.company._id,
				supplies: supplies
			}).exec((err, foundWh) => {
				if (err) {
					winston.error("/submitOrder error", err);
					return res
						.status(200)
						.json({ success: false, msg: locale("system_err") });
				} else {
					if (foundWh.length > 0) {
						return res.json({
							success: false,
							msg: locale("order_routers_all.name_repetition")
						});
					} else {
						let newWh = new Order();
						newWh.supplies = supplies;
						newWh.company = req.company._id;
						newWh.save((err) => {
							if (err) {
								winston.error("/ save error", err);
								return res.json({
									success: false,
									msg: locale("system_err")
								});
							} else {
								return res.json({ success: true, data: newWh });
							}
						});
					}
				}
			});
		} else {
			return res.json({ success: false, msg: "wat" });
		}
	});
	router.post(
		"/updateOrder",
		auth.company,
		[
			check("orderID")
				.not()
				.isEmpty()
				.withMessage(locale("order_routers_all.locationError.insert"))
				.isMongoId()
				.withMessage(locale("order_routers_all.idError.insert")),
			check("status").not().isEmpty().withMessage(locale("order_routers_all.statusError.insert"))
		],
		(req, res) => {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res
					.status(200)
					.json({ success: false, msg: errors.array()[0].msg });
			}
			const { orderID, status } = req.body;
			if (orderID && status) {
				Order.findOneAndUpdate(
					{
						status: { $ne: "delete" },
						company: req.company._id,
						_id: orderID
					},
					{
						status: status
					},
					{ new: true }
				).exec((err, foundWh) => {
					if (err) {
						winston.error("/submitOrder error", err);
						return res
							.status(200)
							.json({ success: false, msg: locale("system_err") });
					} else {
						return res.json({ success: true, data: foundWh });
					}
				});
			} else {
				return res.json({ success: false, msg: "wat" });
			}
		}
	);
	router.post("/distributeRestock", auth.company, (req, res) => {
		const { order, subProduct, supplies, cost } = req.body;
		let product = "";
		const companyID = req.company._id;
		const userID = req.user._id;
		let newSupply = [];
		SubProduct.findOne({ _id: subProduct }).exec((err, foundSP) => {
			if (err) {
				winston.error("/distributeRestock err", err);
				return res.json({ success: false, msg: locale("system_err") });
			} else {
				if (foundSP && foundSP._id) {
					product = foundSP.product;
					for (const supply of supplies) {
						newSupply.push({
							company: companyID,
							warehouse: supply.warehouse,
							subProduct: subProduct,
							product: product,
							order: order,
							cost: cost,
							quantity: supply.quantity,
							quantity_initial: supply.quantity,
							created_by: {
								user: userID,
								emp: companyID
							},
							type: "order"
						});
					}
					Supply.create(newSupply, (err, supplies) => {
						if (err) {
							winston.error("/distributeRestock err", err);
							return res.json({
								success: false,
								msg: locale("system_err")
							});
						} else {
							Order.findOne({
								_id: order
							}).exec((err, foundOrder) => {
								if (err) {
									winston.error(
										"/distributeRestock Order Find error",
										err
									);
								} else {
									if (foundOrder) {
										let found = false;
										let all = true;
										for (
											let idx = 0;
											idx < foundOrder.supplies.length;
											idx++
										) {
											const supp =
												foundOrder.supplies[idx];
											if (
												supp.subProduct.toString() ===
												subProduct.toString()
											) {
												supp.stocked = true;
												found = true;
											}
											if (supp.stocked === false) {
												all = false;
											}
										}
										if (all) {
											foundOrder.status = "stocked";
										}
										foundOrder.save((err, savedOrder) => {
											if (err) {
												winston.error(
													"/distributeRestock order save error",
													err
												);
												return res.json({
													success: false,
													msg: locale("system_err")
												});
											} else {
												return res.json({
													success: true,
													data: savedOrder
												});
											}
										});
									} else {
										return res.json({ success: false });
									}
								}
							});
						}
					});
				} else {
					return res.json({ success: false, msg: "aaaaaaa" });
				}
			}
		});
	});
	router.post("/deleteOrder", (req, res, next) => auth.company(req, res, next, ['restock']), (req, res) => {
		if (req.body.warehouse) {
			Order.findOneAndUpdate(
				{
					status: { $ne: "delete" },
					company: req.company._id,
					_id: req.body.warehouse
				},
				{
					status: "delete"
				},
				{ new: true },
				(err, updated) => {
					if (err) {
						winston.error("/deleteOrder save error", err);
						return res.json({
							success: false,
							msg: locale("system_err")
						});
					} else {
						if (updated) {
							return res.json({ success: true, data: updated });
						} else {
							return res.json({
								success: false,
								msg: locale("unsuccessful")
							});
						}
					}
				}
			);
		} else {
			return res.json({ success: false, msg: locale("insert_value") });
		}
	});
};
