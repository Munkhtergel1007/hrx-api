import winston from "winston";
import async, { filter } from "async";
import { check, validationResult } from "express-validator/check";
import { matchedData } from "express-validator/filter";
import {
    isId,
    isValidDate,
    winsErr,
    companyAdministrator,
    getDatesBetweenDates
} from "../../config";
const mongoose = require("mongoose");
let ObjectId = mongoose.Types.ObjectId;
import Warehouse from "../../models/Warehouse";
import auth, { company, employee } from "../../auth";
import Supply from "../../models/Supply";
import Product from "../../models/Product";
import SubProduct from "../../models/SubProduct";
import Sell from "../../models/Sell";
import moment from "moment";
import {locale} from "../../lang";
import Employee from "../../models/Employee";
import User from "../../models/User";
let slug = require("slug");

module.exports = function (router) {
    router.get("/getWarehouses", auth.company, (req, res) => {
        if (req.query && Object.keys(req.query).length > 0) {
            const { companyID } = req.query;
            let filter = [{ status: "active", company: companyID }];
            // if (!companyAdministrator(req.employee)) {
            // 	filter.push({ "employees.emp": req.employee._id });
            // }
            Warehouse.find({ $and: filter })
                .deepPopulate(["employees.user", "employees.emp"])
                .exec((err, foundWh) => {
                    if (err) {
                        winston.error("/getWarehouses error", err);
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
    router.get("/getWarehouseSingle", auth.company, (req, res) => {
        if (req.query && Object.keys(req.query).length > 0) {
            const { warehouseID } = req.query;
            Warehouse.findOne({ status: "active", _id: warehouseID }).exec(
                (err, foundWh) => {
                    if (err) {
                        winston.error("/getWarehouses error", err);
                        return res.json({
                            success: false,
                            msg: locale("system_err")
                        });
                    } else {
                        // return res.json({ success: true, data: foundWh });
                        return res.json({ success: true, data: foundWh });
                    }
                }
            );
        } else {
            return res.json({ success: false, msg: locale("insert_value") });
        }
    });
    router.get("/getWarehouseSingleProducts", auth.company, (req, res) => {
        let filtersSupply = [
                { warehouse: req.query.warehouse },
                { status: "active" },
                { company: req.company._id }
            ], //type,
            filtersProduct = [
                { status: "active" },
                { company: req.company._id }
            ], //category, assets, subCategory
            filterSubProduct = [
                { status: "active" },
                { company: req.company._id }
            ]; //subAsset
        //Product Filter
        if ((req.query.search || "").trim())
            filtersProduct.push({
                title: new RegExp(".*" + req.query.search + ".*", "i")
            });
        if (req.query.category && req.query.category !== "all")
            filtersProduct.push({ category: ObjectId(req.query.category) });
        if (req.query.subCategory && req.query.subCategory !== "all")
            filtersProduct.push({
                subCategory: ObjectId(req.query.subCategory)
            });
        if (req.query.assets && (req.query.assets || []).length !== 0)
            (req.query.assets || []).map((asset) =>
                filtersProduct.push({ assets: ObjectId(asset) })
            );
        //SubProduct Filter
        if (req.query.subAssets && (req.query.subAssets || []).length !== 0)
            (req.query.subAssets || []).map((subAsset) =>
                filterSubProduct.push({ subAssets: ObjectId(subAsset) })
            );
        //Supply Filter
        if (req.query.status && req.query.status !== "all")
            filtersSupply.push({ status: req.query.status });
        if (req.query.type && req.query.type !== "all")
            filtersSupply.push({ type: req.query.type });

        Product.find({ $and: filtersProduct })
            .lean()
            .exec(function (err, prods) {
                if (err) {
                    winsErr(
                        req,
                        err,
                        "/getWarehouseSingleProducts - product.find()"
                    );
                    return res.json({
                        success: false,
                        msg: `${locale("system_err")} 1`
                    });
                } else {
                    filterSubProduct.push({
                        product: {
                            $in: (prods || []).map((prod) => ObjectId(prod._id))
                        }
                    });
                    SubProduct.find({ $and: filterSubProduct })
                        .deepPopulate(["subAssets"])
                        .lean()
                        .exec(function (err, subProds) {
                            if (err) {
                                winsErr(
                                    req,
                                    err,
                                    "/getWarehouseSingleProducts - subProducts.find()"
                                );
                                return res.json({
                                    success: false,
                                    msg: `${locale("system_err")} 2`
                                });
                            } else {
                                filtersSupply.push({
                                    subProduct: {
                                        $in: (subProds || []).map(
                                            (subProd) => subProd._id
                                        )
                                    }
                                });
                                // filtersSupply
                                Supply.find({ $and: filtersSupply })
                                    .lean()
                                    .deepPopulate(["order"])
                                    .exec(function (err, supplies) {
                                        if (err) {
                                            winsErr(
                                                req,
                                                err,
                                                "/getWarehouseSingleProducts - supply.find()"
                                            );
                                            return res.json({
                                                success: false,
                                                msg: `${locale("system_err")} 3`
                                            });
                                        } else {
											let sda = (subProds || []).map(
												(subProd) => {
													let subProdParent = {};
													(prods || []).map(
														(prod) => {
															if (
																(
																	prod._id ||
																	"as"
																).toString() ===
																(
																	subProd.product ||
																	""
																).toString()
															) {
																subProdParent =
																	prod;
															}
														}
													);
													return {
														...subProd,
														product: subProdParent
													};
												}
											);
											sda = (sda || []).sort(
												(a, b) => {
													if (
														((a.product || {}).title ||
															"as") >
														((b.product || {}).title ||
															"bs")
													)
														return 1;
													else return -1;
												}
											);
                                            return res.json({
                                                success: true,
                                                subProducts: (sda || []),
                                                supplies: supplies
                                            });
                                        }
                                    });
                            }
                        });
                }
            });
    });
    router.post(
        "/submitWarehouse",
        (req, res, next) => auth.company(req, res, next, ["warehouse"]),
        (req, res) => {
            let { title, _id, employees } = req.body;
            title = title.toString().trim();
            if (!employees || (employees || []).length <= 0)
                return res.json({ success: false, msg: locale("choose_employee") });
            if (title && req.company._id) {
                if (_id) {
                    Warehouse.findOne({
                        status: { $ne: "delete" },
                        _id: _id
                    }).exec((err, foundWh) => {
                        if (err) {
                            winston.error("/submitWarehouse error 1", err);
                            return res.status(200).json({
                                success: false,
                                msg: `${locale("system_err")} 1`
                            });
                        } else {
                            foundWh.title = title;
                            foundWh.employees = (employees || []).map(
                                (employee) => {
                                    return {
                                        emp: employee._id,
                                        user: (employee.user || {})._id
                                    };
                                }
                            );
                            foundWh.save((err, newWh) => {
                                if (err) {
                                    winston.error("/ save error 1", err);
                                    return res.json({
                                        success: false,
                                        msg: `${locale("system_err")} 2`
                                    });
                                } else {
                                    return res.json({
                                        success: true,
                                        data: foundWh,
                                        _id: _id,
                                        employees: employees || []
                                    });
                                }
                            });
                        }
                    });
                } else {
                    Warehouse.find({
                        status: { $ne: "delete" },
                        company: req.company._id,
                        title: title
                    }).exec((err, foundWh) => {
                        if (err) {
                            winston.error("/submitWarehouse error", err);
                            return res.status(200).json({
                                success: false,
                                msg: `${locale("system_err")} 1`
                            });
                        } else {
                            if (foundWh.length > 0) {
                                return res.json({
                                    success: false,
                                    msg: locale("warehouse_routers_all.name_repetition")
                                });
                            } else {
                                let newWh = new Warehouse();
                                newWh.title = title;
                                newWh.company = req.company._id;
                                newWh.employees = (employees || []).map(
                                    (employee) => {
                                        return {
                                            emp: employee._id,
                                            user: (employee.user || {})._id
                                        };
                                    }
                                );
                                newWh.save((err) => {
                                    if (err) {
                                        winston.error("/ save error", err);
                                        return res.json({
                                            success: false,
                                            msg: `${locale("system_err")} 2`
                                        });
                                    } else {
                                        return res.json({
                                            success: true,
                                            data: newWh,
                                            employees: employees || []
                                        });
                                    }
                                });
                            }
                        }
                    });
                }
            } else {
                return res.json({ success: false, msg: locale("error") });
            }
        }
    );
    router.post(
        "/deleteWarehouse",
        (req, res, next) => auth.company(req, res, next, ["warehouse"]),
        (req, res) => {
            if (req.body.warehouse) {
                Warehouse.findOneAndUpdate(
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
                            winston.error("/deletwarehouse save error", err);
                            return res.json({
                                success: false,
                                msg: `${locale("system_err")} 1`,
                                _id: req.body.warehouse
                            });
                        } else {
                            if (updated) {
                                return res.json({
                                    success: true,
                                    data: updated,
                                    _id: req.body.warehouse
                                });
                            } else {
                                return res.json({
                                    success: false,
                                    msg: locale("unsuccessful"),
                                    _id: req.body.warehouse
                                });
                            }
                        }
                    }
                );
            } else {
                return res.json({ success: false, msg: locale("insert_value") });
            }
        }
    );
    router.get("/getRequestSubProduct", auth.company, (req, res) => {
        const { company, warehouse, type } = req.query;
        let filter = [
            { company: ObjectId(req.company._id) },
            {
                $or: [
                    { warehouse: ObjectId(warehouse) },
                    { warehouseGiven: ObjectId(warehouse) }
                ]
            },
            // { status: "pending" },
            { type: "given" }
        ],
            filterProduct = [
                {
                    $eq: ["$_id", "$$id"]
                }
            ];
        if(req.query.search)
            filterProduct.push({ //switch on
                // $eq: ["$title", ]
                $regexMatch: {input: "$title", regex: `${req.query.search}`, options:"i"}
            })
        if(req.query.date){
            let startDate = new Date(req.query.date), endDate = new Date(req.query.date);
            startDate.setMinutes(0,0,0,0);
            endDate.setDate(endDate.getDate()+1);
            endDate.setMinutes(0,0,0,0);
            filter.push({
                $expr: {
                    $and: [
                        {$gte: ["$created", startDate]},
                        {$lte: ["$created", endDate]},
                    ]
                }
            })
        }
        Sell.aggregate([
            {
                $match: {
                    $and: filter
                }
            },
            {
                $lookup: {
                    from: "warehouses",
                    let: { id: "$warehouse" },
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
                    as: "warehouse"
                }
            },
            {
                $set: {
                    warehouse: {
                        $arrayElemAt: ["$warehouse", 0]
                    }
                }
            },
            {
                $lookup: {
                    from: "warehouses",
                    let: { id: "$warehouseGiven" },
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
                    as: "warehouseGiven"
                }
            },
            {
                $set: {
                    warehouseGiven: {
                        $arrayElemAt: ["$warehouseGiven", 0]
                    }
                }
            },
            {
                $lookup: {
                    from: "products",
                    let: { id: "$product", title: "$title" }, //switch on
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: filterProduct
                                }
                            }
                        }
                    ],
                    as: "product"
                }
            },
            // {
            //     $set: {
            //         product: {
            //             $arrayElemAt: ["$product", 0]
            //         }
            //     }
            // },
            {
                $unwind: "$product"
            },
            {
                $lookup: {
                    from: "subproducts",
                    let: { id: "$subProduct" },
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
                    as: "subProduct"
                }
            },
            {
                $set: {
                    subProduct: {
                        $arrayElemAt: ["$subProduct", 0]
                    }
                }
            },
            {
                $unwind: "$subProduct.subAssets"
            },
            {
                $lookup: {
                    from: "subassets",
                    let: { id: "$subProduct.subAssets" },
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
                    as: "subAssets"
                }
            },
            {
                $set: {
                    subAssets: {
                        $arrayElemAt: ["$subAssets", 0]
                    }
                }
            },
            {
                $group: {
                    _id: "$_id",
                    price: { $first: "$price" },
                    quantity: { $first: "$quantity" },
                    status: { $first: "$status" },
                    created: { $first: "$created" },
                    company: { $first: "$company" },
                    warehouse: { $first: "$warehouse" },
                    warehouseGiven: { $first: "$warehouseGiven" },
                    subProduct: { $first: "$subProduct" },
                    subAssets: { $push: "$subAssets" },
                    product: { $first: "$product" },
                    supply: { $first: "$supply" },
                    type: { $first: "$type" }
                }
            },
            { $sort: { created: -1 } }
        ]).exec(function (err, request) {
            if (err) {
                winston.error("/getRequestSubProduct error", err);
                return res.json({ success: true, data: [] });
            } else {
                return res.json({ success: true, data: request });
            }
        });
    });

    router.get("/getSoldSubProduct", auth.company, (req, res) => {
        const { company, warehouse, type } = req.query;
        let aggQu = [
            {
                $eq: ["$_id", "$$id"]
            }
        ];
        if (req.query.search && req.query.search !== "") {
            let searchRegex = new RegExp(".*" + req.query.search + ".*", "i");
            aggQu = [
                {
                    $eq: ["$_id", "$$id"]
                },
                {
                    $regexMatch: { input: "$title", regex: searchRegex }
                }
            ];
        }
        let ending, starting;
        if (isValidDate(req.query.date)) {
            starting = new Date(moment(req.query.date));
            ending = new Date(moment(req.query.date));
            ending.setDate(ending.getDate() + 1);
            ending.setMilliseconds(ending.getMilliseconds() - 1);
            // console.log(starting);
            // console.log(ending);
        }
        Sell.aggregate([
            {
                $match: {
                    $and: [
                        { company: ObjectId(req.company._id) },
                        { warehouse: ObjectId(warehouse) },
                        { status: "active" },
                        { type: "sold" },
                        { created: { $gte: starting } },
                        { created: { $lte: ending } }
                    ]
                }
            },
            {
                $lookup: {
                    from: "products",
                    let: { id: "$product" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: aggQu
                                }
                            }
                        }
                    ],
                    as: "product"
                }
            },
            { $unwind: "$product" },
            // {
            //     $set: {
            //         product: {
            //             $arrayElemAt: ["$product", 0]
            //         }
            //     }
            // },
            {
                $lookup: {
                    from: "subproducts",
                    let: { id: "$subProduct" },
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
                    as: "subProduct"
                }
            },
            {
                $set: {
                    subProduct: {
                        $arrayElemAt: ["$subProduct", 0]
                    }
                }
            },
            {
                $unwind: "$subProduct.subAssets"
            },
            {
                $lookup: {
                    from: "subassets",
                    let: { id: "$subProduct.subAssets" },
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
                    as: "subAssets"
                }
            },
            {
                $set: {
                    subAssets: {
                        $arrayElemAt: ["$subAssets", 0]
                    }
                }
            },
            {
                $lookup: {
                    from: "supplies",
                    let: { id: "$supply" },
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
                    as: "supply"
                }
            },
            {
                $unwind: "$supply"
            },
            {
                $group: {
                    _id: "$_id",
                    price: { $first: "$price" },
                    quantity: { $first: "$quantity" },
                    status: { $first: "$status" },
                    created: { $first: "$created" },
                    company: { $first: "$company" },
                    warehouse: { $first: "$warehouse" },
                    subProduct: { $first: "$subProduct" },
                    description: { $first: "$description" },
                    subAssets: { $push: "$subAssets" },
                    product: { $first: "$product" },
                    paidType: { $first: "$paidType" },
                    supply: { $first: "$supply" },
                    type: { $first: "$type" }
                }
            },
            { $sort: { created: +1 } }
        ]).exec(function (err, sold) {
            if (err) {
                winston.error("/getSoldSubProduct error", err);
                return res.json({ success: true, data: [] });
            } else {
                return res.json({ success: true, data: sold });
            }
        });
    });
    router.get("/getInteractionSubProduct", auth.company, (req, res) => {
        const { company, warehouse, type } = req.query;
        Sell.aggregate([
            {
                $match: {
                    $and: [
                        { company: ObjectId(req.company._id) },
                        { warehouse: ObjectId(warehouse) },
                        // {status: "active"},
                        {
                            $or: [
                                { type: "interGiven" },
                                { type: "interTaken" }
                            ]
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: "products",
                    let: { id: "$product" },
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
                    as: "product"
                }
            },
            {
                $set: {
                    product: {
                        $arrayElemAt: ["$product", 0]
                    }
                }
            },
            {
                $lookup: {
                    from: "subproducts",
                    let: { id: "$subProduct" },
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
                    as: "subProduct"
                }
            },
            {
                $set: {
                    subProduct: {
                        $arrayElemAt: ["$subProduct", 0]
                    }
                }
            },
            {
                $unwind: {
                    path: "$subProduct.subAssets",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "subassets",
                    let: { id: "$subProduct.subAssets" },
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
                    as: "subAssets"
                }
            },
            {
                $set: {
                    subAssets: {
                        $arrayElemAt: ["$subAssets", 0]
                    }
                }
            },
            {
                $group: {
                    _id: "$_id",
                    status: { $first: "$status" },
                    created: { $first: "$created" },
                    company: { $first: "$company" },
                    warehouse: { $first: "$warehouse" },
                    subProduct: { $first: "$subProduct" },
                    subAssets: { $push: "$subAssets" },
                    product: { $first: "$product" },
                    type: { $first: "$type" },
                    paidType: { $first: "$paidType" },
                    priceSold: { $first: "$priceSold" },
                    priceGot: { $first: "$priceGot" },
                    description: { $first: "$description" }
                }
            },
            { $sort: { created: -1 } }
        ]).exec(function (err, sold) {
            if (err) {
                winston.error("/getInteractionSubProduct error", err);
                return res.json({ success: true, data: [] });
            } else {
                return res.json({ success: true, data: sold });
            }
        });
    });
    router.post("/giveSubProductOffer", auth.company, (req, res) => {
        function saveSupply(sell, req, res, status) {
            Supply.findOne({ _id: sell.supply }).exec(function (err, supp) {
                if (err) {
                    winston.error("/giveSubProductOffer supply.findOne()", err);
                    return res.json({
                        success: false,
                        msg: `${locale("system_err")} 4`
                    });
                }
                if (status === "active") {
                    let supply = new Supply();
                    supply.company = req.company._id;
                    supply.warehouse = sell.warehouseGiven;
                    supply.subProduct = sell.subProduct;
                    supply.product = sell.product;
                    supply.order = supp.order;
                    supply.cost = supp.cost || 0;
                    supply.quantity = sell.quantity;
                    supply.quantity_initial = sell.quantity;
                    supply.parent_sell = sell._id;
                    supply.created_by = {
                        emp: req.employee._id,
                        user: req.user._id
                    };
                    supply.type = "warehouse";
                    supply.save((err, saved) => {
                        if (err) {
                            winsErr(
                                req,
                                err,
                                "/giveSubProduct - supply save() 1"
                            );
                            return res.json({
                                success: false,
                                msg: `${locale("system_err")} 6`
                            });
                        } else {
                            return res.json({
                                success: true,
                                _id: sell._id,
                                status: req.body.status,
                                subProd: sell.subProduct,
                                quantity: sell.quantity
                            });
                        }
                    });
                } else {
                    if (supp.status === "soldOut") supp.status = "active";
                    supp.quantity += sell.quantity;
                    supp.parent_sell = sell._id;
                    supp.save((err, saved) => {
                        if (err) {
                            winsErr(
                                req,
                                err,
                                "/giveSubProduct - supply save() 2"
                            );
                            return res.json({
                                success: false,
                                msg: `${locale("system_err")} 7`
                            });
                        } else {
                            return res.json({
                                success: true,
                                _id: sell._id,
                                status
                            });
                        }
                    });
                }
            });
        }

        const { _id, status } = req.body;
        Sell.findOne({ _id: _id, status: "pending" }).exec(function (
            err,
            sell
        ) {
            if (err) {
                winston.error("/giveSubProductOffer sell.findOne()", err);
                return res.json({ success: false, msg: `${locale("system_err")} 1` });
            }
            if (sell) {
                sell.employee = {
                    emp: req.employee._id,
                    user: req.user._id,
                    type: "dealt"
                };
                if (status === "active") {
                    sell.status = "active";
                    sell.save((err, saved) => {
                        if (err) {
                            winston.error(
                                "/giveSubProductOffer sell.save() 1",
                                err
                            );
                            return res.json({
                                success: false,
                                msg: `${locale("system_err")} 2`
                            });
                        } else {
                            saveSupply(sell, req, res, status);
                        }
                    });
                } else {
                    sell.status = "declined";
                    sell.save((err, saved) => {
                        if (err) {
                            winston.error(
                                "/giveSubProductOffer sell.save() 2",
                                err
                            );
                            return res.json({
                                success: false,
                                msg: `${locale("system_err")} 3`
                            });
                        } else {
                            saveSupply(sell, req, res, status);
                        }
                    });
                }
            } else {
                return res.json({ success: false, msg: locale("warehouse_routers_all.request_not_found") });
            }
        });
    });
    router.get("/getWarehouseSells", auth.company, (req, res) => {
        console.log("/getWarehouseSells hit", req.query);
        const { warehouseID } = req.query;
        const compID = req.company._id;
        if (warehouseID && compID) {
            if (mongoose.isValidObjectId(warehouseID)) {
                Sell.find({
                    company: compID,
                    warehouse: warehouseID,
                    type: "sold"
                }).exec((err, foundSell) => {
                    if (err) {
                        winston.error("/getWarehouseIncome err", err);
                        return res.json({
                            success: false,
                            msg: `${locale("system_err")} 1`
                        });
                    } else {
                        console.log("foundSell", foundSell);
                        return res.json({
                            success: true,
                            data: foundSell,
                            warehouseID: warehouseID
                        });
                    }
                });
            } else {
                return res.json({ success: false, msg: "non-ID-query" });
            }
        } else {
            return res.json({ success: false, msg: "non-query" });
        }
    });
    router.get("/getDetails", (req, res) => {
        const { subID, warehouseID, start, end } = req.query;
        console.log("warehouseId", warehouseID);
        const payload = {};
        let searchQuery = {
            subProduct: subID,
            warehouse: warehouseID,
            status: { $ne: "delete" },
            type: { $ne: "given" }
        };
        let dates;
        if (isValidDate(start) && isValidDate(end)) {
            let endDate = new Date(moment(end));
            let startDate = new Date(moment(start));
            endDate.setDate(endDate.getDate() + 1);
            endDate.setMilliseconds(endDate.getMilliseconds() - 1);
            dates = {
                $lte: endDate,
                $gte: startDate
            };
            searchQuery["created"] = dates;
        }
        if (
            mongoose.isValidObjectId(subID) &&
            mongoose.isValidObjectId(warehouseID)
        ) {
            Sell.find(searchQuery)
                .deepPopulate(["supply"])
                .sort({ created: -1 })
                .exec((err, foundSells) => {
                    if (err) {
                        winston.error("/getDetails err", err);
                        return res.json({
                            success: false,
                            msg: `${locale("system_err")} 1`
                        });
                    } else {
                        Supply.find({
                            subProduct: subID,
                            warehouse: warehouseID
                        })
                            .sort({ created: -1 })
                            .exec((err, foundSupplies) => {
                                if (err) {
                                    winston.error(
                                        "/getDetails Supply find err",
                                        err
                                    );
                                    return res.json({
                                        success: false,
                                        msg: `${locale("system_err")} 2`
                                    });
                                } else {
                                    console.log("foundSupplies", foundSupplies);
                                    payload.supplies = foundSupplies;
                                    payload.sells = foundSells;
                                    return res.json({
                                        success: true,
                                        data: payload
                                    });
                                }
                            });
                    }
                });
        } else {
            return res.json({ success: false, msg: "incorrect subID" });
        }
    });
    router.get("/getAllDetails", (req, res) => {
        console.log('help', )
        const { subID, warehouseID, start, end, paymentType } = req.query;
        const payload = {};
        let searchQuery = {
            warehouse: warehouseID,
            status: { $ne: "delete" },
            type: { $ne: "given" }
        };
        if (isValidDate(end) && isValidDate(start)) {
            let dates;
            let ending, starting;
            ending = new Date(moment(end));
            starting = new Date(moment(start));
            ending.setDate(ending.getDate() + 1);
            ending.setMilliseconds(ending.getMilliseconds() - 1);
            dates = {
                $lte: ending,
                $gte: starting
            };
            searchQuery["created"] = dates;
        }
        if (subID) {
            searchQuery["subProduct"] = subID;
        }
        if (paymentType && paymentType !== "") {
            searchQuery["paidType"] = paymentType;
        }
        // let dates;
        // if (isValidDate(start) && isValidDate(end)) {
        //     let endDate = new Date(end);
        //     let startDate = new Date(start);
        //     dates = {
        //         $lte: endDate,
        //         $gte: startDate
        //     };
        //     searchQuery["created"] = dates;
        // }
        if (mongoose.isValidObjectId(warehouseID)) {
            Sell.find(searchQuery)
                .deepPopulate([
                    "subProduct",
                    "subProduct.subAssets",
                    "product",
                    "supply"
                ])
                .sort({ created: -1 })
                .exec((err, foundSells) => {
                    if (err) {
                        winston.error("/getAllDetails err", err);
                        return res.json({
                            success: false,
                            msg: `${locale("system_err")} 1`
                        });
                    } else {
                        Supply.find(searchQuery)
                            .deepPopulate([
                                "subProduct",
                                "subProduct.subAssets",
                                "product"
                            ])
                            .sort({ created: -1 })
                            .exec((err, foundSupplies) => {
                                if (err) {
                                    winston.error(
                                        "/getAllDetails Supply find err",
                                        err
                                    );
                                    return res.json({
                                        success: false,
                                        msg: `${locale("system_err")} 2`
                                    });
                                } else {
                                    function groupBySubProductID(
                                        foundSupplies
                                    ) {
                                        let groupedSupplies = {};
                                        groupedSupplies.interChange = [];
                                        foundSupplies.forEach((supply) => {
                                            if (supply.subProduct) {
                                                if (
                                                    groupedSupplies[
                                                        supply.subProduct._id
                                                    ]
                                                ) {
                                                    groupedSupplies[
                                                        supply.subProduct._id
                                                    ].push(supply);
                                                } else {
                                                    groupedSupplies[
                                                        supply.subProduct._id
                                                    ] = [supply];
                                                }
                                            } else {
                                                groupedSupplies[
                                                    "interChange"
                                                ].push(supply);
                                            }
                                        });
                                        return groupedSupplies;
                                    }
                                    payload.supplies = foundSupplies;
                                    payload.seperatedSupplies =
                                        groupBySubProductID(foundSupplies);
                                    payload.seperatedSales =
                                        groupBySubProductID(foundSells);
                                    const keyArray = Object.keys(
                                        payload.seperatedSupplies
                                    ).filter((key) => key !== "interChange");
                                    SubProduct.find({
                                        _id: { $in: keyArray }
                                    })
                                        .deepPopulate(["subAssets", "product"])
                                        .exec((err, foundSubProducts) => {
                                            if (err) {
                                                winston.error(
                                                    "/getAllDetails SubProduct find err",
                                                    err
                                                );
                                                return res.json({
                                                    success: false,
                                                    msg: `${locale("system_err")} 3`
                                                });
                                            } else {
                                                payload.subProducts =
                                                    foundSubProducts;
                                                payload.sells = foundSells;
                                                return res.json({
                                                    success: true,
                                                    data: payload
                                                });
                                            }
                                        });
                                }
                            });
                    }
                });
        } else {
            return res.json({ success: false, msg: "incorrect subID" });
        }
    });
    router.get("/getWarehouseSales", (req, res) => {
        const { warehouseID, start, end } = req.query;
        let searchQuery = {
            warehouse: warehouseID,
            status: { $ne: "delete" },
            type: { $ne: "given" }
        };
        if (isValidDate(end) && isValidDate(start)) {
            let dates;
            let ending, starting;
            ending = new Date(moment(end));
            starting = new Date(moment(start));
            ending.setDate(ending.getDate() + 1);
            ending.setMilliseconds(ending.getMilliseconds() - 1);
            dates = {
                $lte: ending,
                $gte: starting
            };
            searchQuery["created"] = dates;
        }
        if (mongoose.isValidObjectId(warehouseID)) {
            Sell.find(searchQuery)
                .deepPopulate([
                    "subProduct",
                    "subProduct.subAssets",
                    "product",
                    "supply"
                ])
                .sort({ created: -1 })
                .exec((err, foundSells) => {
                    if (err) {
                        winston.error("/getWarehouseSales err", err);
                        return res.json({
                            success: false,
                            msg: `${locale("system_err")} 1`
                        });
                    } else {
                        return res.json({
                            success: true,
                            data: foundSells
                        });
                    }
                });
        } else {
            return res.json({ success: false, msg: "incorrect warehouseID" });
        }
    });



    // router.get("/get/single/product/history", auth.company, (req, res) => {
    //     if (isId(req.query.warehouseId) && isId(req.query.productId)) {
    //         let searchQuSupply = [
    //             // {$or: [
    //             //     {status: "active"},
    //             //     {status: "pending"}
    //             // ]} ,
    //             {type: 'order' },
    //             {company: req.company._id },
    //             {warehouse: req.query.warehouseId},
    //             {product: req.query.productId},
    //         ];
    //         let searchQuSell = [
    //             {$or: [
    //                 {status: "active"},
    //                 {status: "pending"}
    //             ]} ,
    //             {company: req.company._id }
    //         ];
    //         async.parallel(
    //             [
    //                 function (callback) {
    //                     Supply.find({$and:searchQuSupply})
    //                         .sort({ created: -1 })
    //                         // .skip(
    //                         // 	parseInt(req.query.pageNum) *
    //                         // 		parseInt(req.query.pageSize)
    //                         // )
    //                         // .limit(parseInt(req.query.pageSize))
    //                         // .deepPopulate(["created_by"])
    //                         .lean()
    //                         .exec(function (err, result) {
    //                             async.map(
    //                                 result,
    //                                 function (item, cb) {
    //                                     User.find(getUserQuery(item), {_id:1, first_name:1, last_name:1, register_id:1, phone:1, email:1 })
    //                                         .lean()
    //                                         .exec(function (errT, subUser) {
    //                                             cb(err || errT, {
    //                                                 ...item,
    //                                                 user: subUser || []
    //                                             });
    //                                         });
    //                                 },
    //                                 function (err, ress) {
    //                                     callback(err, ress);
    //                                 }
    //                             );
    //                         });
    //                 },
    //                 function (callback) {
    //                     Employee.count(searchQu).exec(function (err, result) {
    //                         callback(err, result);
    //                     });
    //                 }
    //             ],
    //             function (err, results) {
    //                 if (err) {
    //                     winston.error("/workers/archive", err);
    //                     return res
    //                         .status(200)
    //                         .json({ success: false, msg: locale("system_err"), err });
    //                 }
    //
    //                 let filteredByUser = (results[0] || []).filter(r => r.user && r.user._id)
    //                 let cutted = [];
    //                 if(!isNaN(req.query.pageNum) && !isNaN(req.query.pageSize) && parseInt(req.query.pageNum) == req.query.pageNum && parseInt(req.query.pageSize) == req.query.pageSize){
    //                     (filteredByUser || []).splice((parseInt(req.query.pageNum)*parseInt(req.query.pageSize)), parseInt(req.query.pageSize));
    //                 }
    //                 return res.status(200).json({
    //                     success: true,
    //                     employeesArchive: cutted || [],
    //                     all: results[1] || 0
    //                 });
    //             }
    //         );
    //     } else {
    //         return res.json({
    //             success: false,
    //             msg: `${locale("system_err")} 1`
    //         });
    //     }
    // });
};
