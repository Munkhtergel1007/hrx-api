import winston from "winston";
import async from "async";
import { isId, winsErr } from "../../config";
import { check, validationResult } from "express-validator/check";
import { matchedData } from "express-validator/filter";
import auth from "../../auth";
import Product from "../../models/Product";
import SubProduct from "../../models/SubProduct";
import Supply from "../../models/Supply";
import Sell from "../../models/Sell";
let slug = require("slug");
import {locale} from "../../lang";

module.exports = function (router) {
	router.post("/sellSubProduct", auth.company, async function (req, res) {
		console.log('req.body.description', req.body.description);


		function saveSell(
			supplies,
			index,
			quantity,
			afterQuantity,
			type,
			req,
			res,
			savedSell
		) {
			const {
				warehouse,
				subProduct,
				subProductObj,
				product,
				price,
				description,
				paidType
			} = req.body;
			const company = req.company._id,
				emp = { emp: req.employee._id, user: req.user._id };
			let sell = new Sell();
			sell.company = company;
			sell.warehouse = warehouse;
			sell.subProduct = subProduct;
			sell.product = product;
			sell.supply = supplies[index]._id;
			sell.price = price;
			sell.type = type;
			sell.quantity = quantity;
			sell.created_by = emp;
			sell.paidType = paidType;
			sell.description = description;
			sell.save((err, saved) => {
				if (err) {
					winsErr(req, err, "/sellSubProduct - sell save()");
					return res.json({
						success: false,
						msg: `${locale("system_err")} 3`
					});
				} else {
					savedSell.push({
						...saved._doc,
						subProduct: subProductObj,
						product: (subProductObj || {}).product,
						subAssets: (subProductObj || {}).subAssets
					});
					sellProducts(
						supplies,
						index + 1,
						afterQuantity,
						req,
						res,
						savedSell
					);
				}
			});
		}
		function sellProducts(
			supplies,
			index,
			requiredQuantity,
			req,
			res,
			savedSell
		) {
			const { warehouse, subProduct, product, price } = req.body;
			// const company = req.company._id,
			// 	emp = { emp: req.employee._id, user: req.user._id };
			if (requiredQuantity > 0) {
				if (index < (supplies || []).length) {
					let quantityOfItem = supplies[index].quantity;
					if (quantityOfItem) {
						if (requiredQuantity >= quantityOfItem) {
							supplies[index].quantity = 0;
							supplies[index].status = "soldOut";
							supplies[index].save((err, saved) => {
								if (err) {
									winsErr(
										req,
										err,
										"/sellSubProduct - supply 1 save()"
									);
									return res.json({
										success: false,
										msg: `${locale("system_err")} 2`
									});
								} else {
									saveSell(
										supplies,
										index,
										quantityOfItem,
										requiredQuantity - quantityOfItem,
										"sold",
										req,
										res,
										savedSell
									);
								}
							});
						} else {
							supplies[index].quantity -= requiredQuantity;
							supplies[index].save((err, saved) => {
								if (err) {
									winsErr(
										req,
										err,
										"/sellSubProduct - supply 2 save()"
									);
									return res.json({
										success: false,
										msg: `${locale("system_err")} 4`
									});
								} else {
									saveSell(
										supplies,
										index,
										requiredQuantity,
										requiredQuantity - quantityOfItem,
										"sold",
										req,
										res,
										savedSell
									);
								}
							});
						}
					} else {
						sellProducts(
							supplies,
							index + 1,
							requiredQuantity,
							req,
							res,
							savedSell
						);
					}
				} else {
					winsErr(
						req,
						"Index хэтрэлт",
						"/sellSubProduct index overflow()"
					);
					return res.json({
						msg: `${locale("system_err")} 5`,
						success: false
					});
				}
			} else {
				return res.json({
					subProduct: subProduct,
					quantity: req.body.quantity,
					savedSell: savedSell,
					success: true
				});
			}
		}
		if (!req.body.paidType)
			return res.json({
				success: false,
				msg: locale("sell_routers_all.paidType_empty")
			});
		if (req.body.type === "sold") {
			if (!(req.body.product || "").trim())
				return res.json({
					success: false,
					msg: locale("error")
				});
			if (!(req.body.subProduct || "").trim())
				return res.json({
					success: false,
					msg: locale("sell_routers_all.subProduct_empty")
				});
			if (!req.body.quantity || req.body.quantity <= 0)
				return res.json({
					success: false,
					msg: locale("sell_routers_all.quantity_empty")
				});
			if (!req.body.price)
				return res.json({
					success: false,
					msg: locale("sell_routers_all.price_empty")
				});
			Supply.find({
				quantity: { $ne: 0 },
				status: { $ne: "soldOut" },
				subProduct: req.body.subProduct,
				warehouse: req.body.warehouse
			})
				.sort({ created: 1 })
				.limit(parseInt(req.body.quantity))
				// .deepPopulate(["order"])
				.exec(function (err, supplies) {
					if (err) {
						winston.error("/api/admin/sellSubProduct", err);
						return res.json({
							success: false,
							msg: `${locale("system_err")} 1`
						});
					}
					let count = 0;
					(supplies || []).map(
						(supply) => (count += supply.quantity)
					);
					if (count >= req.body.quantity) {
						let index = 0;
						sellProducts(
							supplies,
							index,
							req.body.quantity,
							req,
							res,
							[]
						);
					} else {
						res.json({
							success: false,
							msg: locale("sell_routers_all.not_enough")
						});
					}
				});
		} else if (
			req.body.type === "interGiven" ||
			req.body.type === "interTaken"
		) {
			if (
				// !(req.body.subProduct || "").trim() &&
				!(req.body.description || "").trim()
			)
				return res.json({
					success: false,
					msg: locale("sell_routers_all.comment_empty")
				});
			const {
				warehouse,
				subProduct,
				product,
				type,
				priceSold,
				priceGot,
				description,
				paidType
			} = req.body;
			const company = req.company._id,
				emp = { emp: req.employee._id, user: req.user._id };
			let sell = new Sell();
			sell.company = company;
			sell.warehouse = warehouse;
			sell.type = type;
			sell.priceSold = priceSold;
			sell.priceGot = priceGot;
			sell.created_by = emp;
			sell.paidType = paidType;
			sell.status = "pending";
			if (subProduct) {
				sell.subProduct = subProduct;
				sell.product = product;
			}
			if (description) {
				sell.description = description;
			}
			sell.save((err, saved) => {
				if (err) {
					return res.json({
						success: false,
						msg: `${locale("system_err")} 6`
					});
				} else {
					return res.json({
						success: true,
						sucmod: true,
						msg: locale("sell_routers_all.save_successful")
					});
				}
			});
		} else {
			return res.json({ success: false, msg: locale("sell_routers_all.type_wrong") });
		}
	});

	router.post(
		"/giveSubProductRequest",
		auth.company,
		async function (req, res) {
			function saveSell(
				supplies,
				index,
				quantity,
				afterQuantity,
				type,
				req,
				res
			) {
				const { warehouse, subProduct, product, warehouseGiven } =
					req.body;
				const company = req.company._id,
					emp = { emp: req.employee._id, user: req.user._id };
				let sell = new Sell();
				sell.company = company;
				sell.warehouse = warehouse;
				sell.subProduct = subProduct;
				sell.product = product;
				sell.supply = supplies[index]._id;
				// sell.price = supplies[index].cost;
				sell.type = type;
				sell.status = "pending";
				sell.warehouseGiven = warehouseGiven;
				sell.quantity = quantity;
				sell.created_by = emp;
				sell.save((err, saved) => {
					if (err) {
						winsErr(req, err, "/giveSubProduct - sell save()");
						return res.json({
							success: false,
							msg: `${locale("system_err")} 3`
						});
					} else {
						// savedSell.push({
						// 	...saved._doc,
						// 	subProduct: subProductObj,
						// 	product: (subProductObj || {}).product,
						// 	subAssets: (subProductObj || {}).subAssets
						// });
						giveSubProduct(
							supplies,
							index + 1,
							afterQuantity,
							req,
							res
						);
						// saveSupply(
						// 	supplies,
						// 	index,
						// 	quantity,
						// 	afterQuantity,
						// 	"warehouse",
						// 	req,
						// 	res
						// );
					}
				});
			}
			// function saveSupply(
			// 	supplies,
			// 	index,
			// 	quantity,
			// 	afterQuantity,
			// 	type,
			// 	req,
			// 	res
			// ) {
			// 	const { warehouse, subProduct, product, warehouseGiven } = req.body;
			// 	const company = req.company._id,
			// 		emp = { emp: req.employee._id, user: req.user._id };
			// 	let supply = new Supply();
			// 	supply.company = company;
			// 	supply.warehouse = warehouseGiven;
			// 	supply.subProduct = subProduct;
			// 	supply.product = product;
			// 	supply.order = supplies[index].order;
			// 	supply.cost = supplies[index].cost;
			// 	supply.quantity = quantity;
			// 	supply.quantity_initial = quantity;
			// 	supply.created_by = emp;
			// 	supply.type = type;
			// 	supply.save((err, saved) => {
			// 		if (err) {
			// 			winsErr(req, err, "/giveSubProduct - supply save()");
			// 			return res.json({
			// 				success: false,
			// 				msg: "Системийн алдаа 6"
			// 			});
			// 		} else {
			// 			giveSubProduct(supplies, index + 1, afterQuantity, req, res);
			// 		}
			// 	});
			// }
			function giveSubProduct(
				supplies,
				index,
				requiredQuantity,
				req,
				res
			) {
				const { warehouse, subProduct, product, warehouseGiven } =
					req.body;
				// const company = req.company._id,
				// 	emp = { emp: req.employee._id, user: req.user._id };
				if (requiredQuantity > 0) {
					if (index < (supplies || []).length) {
						let quantityOfItem = supplies[index].quantity;
						if (quantityOfItem) {
							if (requiredQuantity >= quantityOfItem) {
								supplies[index].quantity = 0;
								supplies[index].status = "soldOut";
								supplies[index].save((err, saved) => {
									if (err) {
										winsErr(
											req,
											err,
											"/giveSubProduct - supply 1 save()"
										);
										return res.json({
											success: false,
											msg: `${locale("system_err")} 2`
										});
									} else {
										saveSell(
											supplies,
											index,
											quantityOfItem,
											requiredQuantity - quantityOfItem,
											"given",
											req,
											res
										);
									}
								});
							} else {
								supplies[index].quantity -= requiredQuantity;
								supplies[index].save((err, saved) => {
									if (err) {
										winsErr(
											req,
											err,
											"/giveSubProduct - supply 2 save()"
										);
										return res.json({
											success: false,
											msg: `${locale("system_err")} 4`
										});
									} else {
										saveSell(
											supplies,
											index,
											requiredQuantity,
											requiredQuantity - quantityOfItem,
											"given",
											req,
											res
										);
									}
								});
							}
						} else {
							sellProducts(
								supplies,
								index + 1,
								requiredQuantity,
								req,
								res
							);
						}
					} else {
						winsErr(
							req,
							"Index хэтрэлт",
							"/giveSubProduct index overflow()"
						);
						return res.json({
							msg: `${locale("system_err")} 5`,
							success: false
						});
					}
				} else {
					return res.json({
						subProduct: subProduct,
						quantity: req.body.quantity,
						success: true
					});
				}
			}

			if (!(req.body.product || "").trim())
				return res.json({
					success: false,
					msg: locale("error")
				});
			if (!(req.body.subProduct || "").trim())
				return res.json({
					success: false,
					msg: locale("sell_routers_all.subProduct_empty")
				});
			if (!req.body.quantity || req.body.quantity <= 0)
				return res.json({
					success: false,
					msg: locale("sell_routers_all.quantity_empty")
				});
			if (!req.body.warehouse)
				return res.json({
					success: false,
					msg: locale("sell_routers_all.warehouse_empty")
				});
			Supply.find({
				quantity: { $ne: 0 },
				status: { $ne: "soldOut" },
				subProduct: req.body.subProduct,
				warehouse: req.body.warehouse
			})
				.sort({ created: 1 })
				.limit(parseInt(req.body.quantity))
				// .deepPopulate(["order"])
				.exec(function (err, supplies) {
					if (err) {
						winston.error("/api/admin/giveSubProduct", err);
						return res.json({
							success: false,
							msg: `${locale("system_err")} 1`
						});
					}
					let count = 0;
					(supplies || []).map(
						(supply) => (count += supply.quantity)
					);
					if (count >= req.body.quantity) {
						let index = 0;
						giveSubProduct(
							supplies,
							index,
							req.body.quantity,
							req,
							res
						);
					} else {
						res.json({
							success: false,
							msg: locale("sell_routers_all.not_enough")
						});
					}
				});
		}
	);
	router.post("/setInteractionSubProduct", auth.company, function (req, res) {
		const { _id, priceSold, priceGot, paidType } = req.body;
		if (!priceSold)
			return res.json({ success: false, msg: locale("sell_routers_all.priceSold_empty") });
		if (!priceGot)
			return res.json({ success: false, msg: locale("sell_routers_all.priceGot_empty") });
		if (!paidType)
			return res.json({
				success: false,
				msg: locale("sell_routers_all.paidType_empty")
			});
		Sell.findOne({ _id: _id, status: 'pending' }).exec(function (err, found) {
			if (err) {
				winston.error("/setInteractionSubProduct", err);
				return res.json({ success: false, msg: `${locale("system_err")} 1` });
			} else {
				if (found) {
					found.priceSold = priceSold;
					found.priceGot = priceGot;
					found.paidType = paidType;
					found.status = "active";
					found.save((err, saved) => {
						if (err) {
							winston.error("/setInteractionSubProduct", err);
							return res.json({
								success: false,
								msg: `${locale("system_err")} 2`
							});
						} else {
							return res.json({
								success: true,
								priceSold,
								priceGot,
								paidType,
								_id
							});
						}
					});
				} else {
					return res.json({
						success: false,
						msg: locale("sell_routers_all.inter_empty")
					});
				}
			}
		});
	});
};
