// async function sellProducts(
//     supplies,
//     index,
//     requiredQuantity,
//     { company, warehouse, subProduct, product, price, emp }
// ) {
//     if (requiredQuantity) {
//         let quantityOfItem = supplies[index].quantity;
//         if (quantityOfItem) {
//             if (requiredQuantity >= quantityOfItem) {
//                 supplies[index].quantity = 0;
//                 supplies[index].status = "soldOut";
//                 let prom = await supplies[index]
//                     .save()
//                     .then(
//                         async () => {
//                             let sell = new Sell();
//                             sell.company = company;
//                             sell.warehouse = warehouse;
//                             sell.subProduct = subProduct;
//                             sell.product = product;
//                             sell.supply = supplies[index]._id;
//                             sell.price = price;
//                             sell.type = "sold";
//                             sell.quantity = requiredQuantity;
//                             sell.emp = emp;
//                             let promise = await sell
//                                 .save()
//                                 .then(
//                                     () => {
//                                         return true;
//                                     },
//                                     () => {
//                                         return false;
//                                     }
//                                 )
//                                 .catch((err) => console.log(err));
//                             return promise;
//                         },
//                         () => {
//                             return false;
//                         }
//                     )
//                     .catch((err) => console.log(err));
//                 if (prom) {
//                     sellProducts(
//                         supplies,
//                         index + 1,
//                         requiredQuantity - quantityOfItem,
//                         {
//                             company: company._id,
//                             warehouse: warehouse,
//                             subProduct: subProduct,
//                             product: product,
//                             price: price,
//                             emp: emp
//                         }
//                     )
//                         .then(
//                             (c) => {
//                                 return true;
//                             },
//                             (d) => {
//                                 return false;
//                             }
//                         )
//                         .catch((err) => console.log(err));
//                 } else {
//                     return false;
//                 }
//             } else {
//                 supplies[index].quantity -= requiredQuantity;
//                 let prom = await supplies[index]
//                     .save()
//                     .then(
//                         async () => {
//                             let sell = new Sell();
//                             sell.company = company;
//                             sell.warehouse = warehouse;
//                             sell.subProduct = subProduct;
//                             sell.product = product;
//                             sell.supply = supplies[index]._id;
//                             sell.price = price;
//                             sell.type = "sold";
//                             sell.quantity = requiredQuantity;
//                             sell.emp = emp;
//                             let promise = await sell
//                                 .save()
//                                 .then(
//                                     () => {
//                                         return true;
//                                     },
//                                     () => {
//                                         return false;
//                                     }
//                                 )
//                                 .catch((err) => console.log(err));
//                             return promise;
//                         },
//                         () => {
//                             return false;
//                         }
//                     )
//                     .catch((err) => console.log(err));
//                 if (prom) {
//                     return true;
//                 } else {
//                     return false;
//                 }
//             }
//         } else {
//             sellProducts(supplies, index + 1, requiredQuantity, {
//                 company: company,
//                 warehouse: warehouse,
//                 subProduct: subProduct,
//                 product: product,
//                 price: price,
//                 emp: emp
//             })
//                 .then(
//                     (c) => {
//                         return true;
//                     },
//                     (d) => {
//                         return false;
//                     }
//                 )
//                 .catch((err) => console.log(err));
//         }
//     } else {
//         return true;
//     }
// }

// async function sellProducts(
// 	supplies,
// 	index,
// 	requiredQuantity,
// 	{ company, warehouse, subProduct, product, price, emp },
// ) {
// 	// console.log(index);
// 	if (requiredQuantity) {
// 		let quantityOfItem = supplies[index].quantity;
// 		if (quantityOfItem) {
// 			// console.log("zero");
// 			if (requiredQuantity >= quantityOfItem) {
// 				// console.log(requiredQuantity, index + " over");
// 				supplies[index].quantity = 0;
// 				supplies[index].status = "soldOut";
// 				let prom = await supplies[index].save().then(
// 					async () => {
// 						// console.log(
// 						// 	requiredQuantity,
// 						// 	index + " sell entered"
// 						// );
// 						let sell = new Sell();
// 						sell.company = company;
// 						sell.warehouse = warehouse;
// 						sell.subProduct = subProduct;
// 						sell.product = product;
// 						sell.supply = supplies[index]._id;
// 						sell.price = price;
// 						sell.quantity = quantityOfItem;
// 						sell.emp = emp;
// 						let promise = await sell.save().then(
// 							() => {
// 								// console.log(
// 								// 	requiredQuantity,
// 								// 	index + " sell saved"
// 								// );
// 								return true;
// 							},
// 							() => {
// 								// console.log(
// 								// 	requiredQuantity,
// 								// 	index + " sell save failed"
// 								// );
// 								return false;
// 							}
// 						);
// 						return promise;
// 					},
// 					() => {
// 						// console.log(
// 						// 	requiredQuantity,
// 						// 	index + " supply saved"
// 						// );
// 						return false;
// 					}
// 				);
// 				if (prom) {
// 					// console.log(
// 					// 	requiredQuantity,
// 					// 	index + " next entered ",
// 					// 	prom
// 					// );
// 					sellProducts(
// 						supplies,
// 						index + 1,
// 						requiredQuantity - quantityOfItem,
// 						{
// 							company: company._id,
// 							warehouse: warehouse,
// 							subProduct: subProduct,
// 							product: product,
// 							price: price,
// 							emp: emp
// 						}
// 					).catch(err => console.log(err)).then(
// 						(c) => {
// 							// console.log(requiredQuantity, index + ' next sell saved ', prom);
// 							return true;
// 						},
// 						(d) => {
// 							// console.log(requiredQuantity, index + ' next sell failed ', prom);
// 							return false;
// 						}
// 					);
// 					// console.log("s");
// 				} else {
// 					console.log(
// 						requiredQuantity,
// 						index + " failed entered ",
// 						prom
// 					);
// 					return false;
// 				}
// 			} else {
// 				// console.log(requiredQuantity, index + " sub");
// 				supplies[index].quantity -= requiredQuantity;
// 				let prom = await supplies[index].save().then(
// 					async () => {
// 						// console.log(
// 						// 	requiredQuantity,
// 						// 	index + " sub entered"
// 						// );
// 						let sell = new Sell();
// 						sell.company = company;
// 						sell.warehouse = warehouse;
// 						sell.subProduct = subProduct;
// 						sell.product = product;
// 						sell.supply = supplies[index]._id;
// 						sell.price = price;
// 						sell.quantity = requiredQuantity;
// 						sell.emp = emp;
// 						let promise = await sell.save().then(
// 							() => {
// 								// console.log(
// 								// 	requiredQuantity,
// 								// 	index + " sell saved"
// 								// );
// 								return true;
// 							},
// 							() => {
// 								// console.log(
// 								// 	requiredQuantity,
// 								// 	index + " sell save failed"
// 								// );
// 								return false;
// 							}
// 						);
// 						return promise;
// 					},
// 					() => {
// 						console.log(
// 							requiredQuantity,
// 							index + " supply saved"
// 						);
// 						return false;
// 					}
// 				);
// 				if (prom) {
// 					// console.log(
// 					// 	requiredQuantity,
// 					// 	index + " sub success entered"
// 					// );
// 					return true;
// 				} else {
// 					// console.log(
// 					// 	requiredQuantity,
// 					// 	index + " sub failed entered"
// 					// );
// 					return false;
// 				}
// 			}
// 		} else {
// 			// console.log(requiredQuantity, index + " skip next ");
// 			sellProducts(supplies, index + 1, requiredQuantity, {
// 				company: company,
// 				warehouse: warehouse,
// 				subProduct: subProduct,
// 				product: product,
// 				price: price,
// 				emp: emp
// 			}).then(
// 				(c) => {
// 					// console.log(
// 					// 	requiredQuantity,
// 					// 	index + " next supply saved ",
// 					// 	prom
// 					// );
// 					return true;
// 				},
// 				(d) => {
// 					// console.log(
// 					// 	requiredQuantity,
// 					// 	index + " next supply failed ",
// 					// 	prom
// 					// );
// 					return false;
// 				}
// 			);
// 		}
// 	} else {
// 		// console.log(requiredQuantity, index + " finish ");
// 		return true;
// 	}
// }

// sellProducts(supplies, index, req.body.quantity, {
// 	company: req.company._id,
// 	warehouse: req.body.warehouse,
// 	subProduct: req.body.subProduct,
// 	product: req.body.product,
// 	price: req.body.price,
// 	emp: { emp: req.employee._id, user: req.user._id }
// }).then(
// 	(c) => {
// 		if (c) {
// 			return res.json({
// 				subProduct: req.body.subProduct,
// 				quantity: req.body.quantity,
// 				success: true
// 			});
// 		} else {
// 			return res.json({
// 				success: false,
// 				msg: "Системийн алдаа 3"
// 			});
// 		}
// 	},
// 	(c) => {
// 		return res.json({
// 			success: false,
// 			msg: "Системийн алдаа 2"
// 		});
// 	}
// );

// { company, warehouse, subProduct, product, price, emp },
// {company: req.company._id,
// 	warehouse: req.body.warehouse,
// 	subProduct: req.body.subProduct,
// 	product: req.body.product,
// 	price: req.body.price,
// 	emp: { emp: req.employee._id, user: req.user._id }

// takeProducts(supplies, index, req.body.quantity, {
//     company: req.company._id,
//     warehouse: req.body.warehouse,
//     subProduct: req.body.subProduct,
//     product: req.body.product,
//     emp: { emp: req.employee._id, user: req.user._id },
//     warehouseTaken: req.body.warehouseTaken
// }).then(
//     (c) => {
//         if (c) {
//             return res.json({
//                 subProduct: req.body.subProduct,
//                 quantity: req.body.quantity,
//                 success: true
//             });
//         } else {
//             return res.json({
//                 success: false,
//                 msg: "Системийн алдаа 3"
//             });
//         }
//     },
//     (c) => {
//         return res.json({
//             success: false,
//             msg: "Системийн алдаа 2"
//         });
//     }
// );

// async function takeProducts(
//     supplies,
//     index,
//     requiredQuantity,
//     { company, warehouse, subProduct, product, emp, warehouseTaken }
// ) {
//     if (requiredQuantity) {
//         let quantityOfItem = supplies[index].quantity;
//         if (quantityOfItem) {
//             if (requiredQuantity >= quantityOfItem) {
//                 supplies[index].quantity = 0;
//                 supplies[index].status = "soldOut";
//                 let prom = await supplies[index]
//                     .save()
//                     .then(
//                         async () => {
//                             let sell = new Sell();
//                             sell.company = company;
//                             sell.warehouse = warehouse;
//                             sell.subProduct = subProduct;
//                             sell.product = product;
//                             sell.supply = supplies[index]._id;
//                             sell.type = "taken";
//                             sell.warehouseTaken = warehouseTaken;
//                             sell.quantity = quantityOfItem;
//                             sell.emp = emp;
//                             let promise = await sell
//                                 .save()
//                                 .then(
//                                     async () => {
//                                         let supply = new Supply();
//                                         supply.company = company;
//                                         supply.warehouse =
//                                             warehouseTaken;
//                                         supply.subProduct = subProduct;
//                                         supply.product = product;
//                                         supply.order =
//                                             supplies[index].order;
//                                         supply.cost =
//                                             supplies[index].cost;
//                                         supply.quantity =
//                                             quantityOfItem;
//                                         supply.quantity_initial =
//                                             quantityOfItem;
//                                         supply.created_by = emp;
//                                         supply.type = "warehouse";
//                                         let promiseInner = await supply
//                                             .save()
//                                             .then(
//                                                 () => {
//                                                     return true;
//                                                 },
//                                                 () => {
//                                                     return false;
//                                                 }
//                                             )
//                                             .catch((err) =>
//                                                 console.log(err)
//                                             );
//                                         if (promiseInner) {
//                                             return true;
//                                         } else {
//                                             return false;
//                                         }
//                                     },
//                                     () => {
//                                         return false;
//                                     }
//                                 )
//                                 .catch((err) => console.log(err));
//                             return promise;
//                         },
//                         () => {
//                             return false;
//                         }
//                     )
//                     .catch((err) => console.log(err));
//                 if (prom) {
//                     takeProducts(
//                         supplies,
//                         index + 1,
//                         requiredQuantity - quantityOfItem,
//                         {
//                             company: company._id,
//                             warehouse: warehouse,
//                             subProduct: subProduct,
//                             product: product,
//                             emp: emp,
//                             warehouseTaken: warehouseTaken
//                         }
//                     )
//                         .then(
//                             (c) => {
//                                 return true;
//                             },
//                             (d) => {
//                                 return false;
//                             }
//                         )
//                         .catch((err) => console.log(err));
//                 } else {
//                     return false;
//                 }
//             } else {
//                 supplies[index].quantity -= requiredQuantity;
//                 let prom = await supplies[index]
//                     .save()
//                     .then(
//                         async () => {
//                             let sell = new Sell();
//                             sell.company = company;
//                             sell.warehouse = warehouse;
//                             sell.subProduct = subProduct;
//                             sell.product = product;
//                             sell.supply = supplies[index]._id;
//                             sell.type = "taken";
//                             sell.warehouseTaken = warehouseTaken;
//                             sell.quantity = requiredQuantity;
//                             sell.emp = emp;
//                             let promise = await sell
//                                 .save()
//                                 .then(
//                                     async () => {
//                                         let supply = new Supply();
//                                         supply.company = company;
//                                         supply.warehouse =
//                                             warehouseTaken;
//                                         supply.subProduct = subProduct;
//                                         supply.product = product;
//                                         supply.order =
//                                             supplies[index].order;
//                                         supply.cost =
//                                             supplies[index].cost;
//                                         supply.quantity =
//                                             requiredQuantity;
//                                         supply.quantity_initial =
//                                             requiredQuantity;
//                                         supply.created_by = emp;
//                                         supply.type = "warehouse";
//                                         let promiseInner = await supply
//                                             .save()
//                                             .then(
//                                                 () => {
//                                                     return true;
//                                                 },
//                                                 () => {
//                                                     return false;
//                                                 }
//                                             )
//                                             .catch((err) =>
//                                                 console.log(err)
//                                             );
//                                         if (promiseInner) {
//                                             return true;
//                                         } else {
//                                             return false;
//                                         }
//                                     },
//                                     () => {
//                                         return false;
//                                     }
//                                 )
//                                 .catch((err) => console.log(err));
//                             return promise;
//                         },
//                         () => {
//                             return false;
//                         }
//                     )
//                     .catch((err) => console.log(err));
//                 if (prom) {
//                     return true;
//                 } else {
//                     return false;
//                 }
//             }
//         } else {
//             takeProducts(supplies, index + 1, requiredQuantity, {
//                 company: company,
//                 warehouse: warehouse,
//                 subProduct: subProduct,
//                 product: product,
//                 emp: emp,
//                 warehouseTaken: warehouseTaken
//             })
//                 .then(
//                     (c) => {
//                         return true;
//                     },
//                     (d) => {
//                         return false;
//                     }
//                 )
//                 .catch((err) => console.log(err));
//         }
//     } else {
//         return true;
//     }
// }