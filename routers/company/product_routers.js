import winston from 'winston';
import async from 'async';
import {check, validationResult} from "express-validator/check";
import {matchedData} from "express-validator/filter";
import auth from "../../auth";
import Product from "../../models/Product";
import SubProduct from "../../models/SubProduct";
let slug = require('slug');
import{locale} from "../../lang";

module.exports = function (router) {
    router.get('/getProduct', auth.company ,function (req, res) {
        let searchQu = {status:'active', company:req.company._id};
        if(req.query.search && req.query.search !==''){
            let regex = new RegExp(".*"+req.query.search+'.*', "i");
            searchQu = { $and: [ {company:req.company._id}, {status:'active'} , {$or:[ {title:regex} ]} ]};
        }
        async.parallel([
            function (callback) {
                Product.find(searchQu)
                    .sort({created: -1})
                    .skip((parseInt(req.query.pageNum)*parseInt(req.query.pageSize)))
                    .limit(parseInt(req.query.pageSize) || 0)
                    .deepPopulate(['company', 'category', 'subCategory', 'assets'])
                    .lean()
                    .exec( function(err,result) {
                        async.map(result, function(item, cb){
                            SubProduct.find({product: item._id, status:'active'}).sort({created: -1}).deepPopulate(["company", "subAssets", "product"]).lean().exec(function(errT, subCat){
                                cb((err || errT),
                                    {
                                        ...item,
                                        child: (subCat || [])
                                    }
                                );
                            });
                        }, function(err, ress){
                            callback(err, ress)
                        });
                    });
            },
            function (callback) {
                Product.count(searchQu).exec( function(err,result) {
                    callback(err, result)
                });
            },
        ],function (err, results) {
            if(err){
                winston.error('/api/admin/getProduct', err);
                return res.status(200).json({success:false, msg: locale("system_err"), err});
            }
            return res.status(200).json({success:true, products:(results[0] || []), all:(results[1] || 0) });
        })
    });
    router.post('/submitProduct', (req, res, next) => auth.company(req, res, next, ['product']) ,[
        check('_id'),
        check('title')
            .not()
            .isEmpty()
            .withMessage(locale("product_routers_all.nameError.insert"))
            .trim(),
        check('assets').custom((options, { req, location, path }) => {
                if (typeof assets === 'object' && assets && Array.isArray(assets) && assets.length) {
                    return false;
                } else {
                    return true;
                }
            })
            .withMessage(locale("product_routers_all.assetError.insert")),
        check('category._id')
            .not()
            .isEmpty()
            .withMessage(locale("product_routers_all.categoryError.insert")),
        check('category.title')
            .not()
            .isEmpty()
            .withMessage(locale("error")),
        check('category.company')
            .not()
            .isEmpty()
            .withMessage(locale("error")),
        check('subCategory._id')
            .not()
            .isEmpty()
            .withMessage(locale("product_routers_all.subCategoryError.insert")),
        check('subCategory.title')
            .not()
            .isEmpty()
            .withMessage(locale("error")),
        check('subCategory.company')
            .not()
            .isEmpty()
            .withMessage(locale("error"))
    ],function (req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(200).json({success:false,msg: errors.array()[0].msg});
        }
        let data = matchedData(req);
        if(data._id){ //update Product
            Product.updateOne(
                {_id:data._id, company:req.company._id},
                {
                    title: data.title,
                    assets: (data.assets || []).map(asset => {
                        return asset._id
                    }),
                    category: (data.category || {})._id,
                    subCategory: (data.subCategory || {})._id,
                },
                function (err, result) {
                if (err) {
                    winston.error('/api/admin/submitProduct', err);
                    return res.status(200).json({success:false,msg: locale("system_err")});
                }
                if(result.nModified){
                    return res.status(200).json({ success:true, _id: data._id, data:data });
                } else {
                    return res.status(200).json({success:false, msg: locale("error")});
                }
            });
        } else { //new Product
            let holdSlug = slug(data.title);
            let regex = new RegExp("^"+holdSlug, "i");
            Product.find({slug:regex},function (err, slugs) {
                if (err) {
                    winston.error('/api/admin/submitProduct', err);
                    return res.status(200).json({ success:false,msg: locale("system_err"), err });
                }
                if(slugs && slugs.length>0){
                    holdSlug = `${holdSlug}-${slugs.length}`
                }
                let product = new Product();
                product.slug = holdSlug;
                product.title = data.title;
                product.assets = (data.assets || []).map(asset => {
                    return asset._id
                });
                product.category = (data.category || {})._id;
                product.subCategory = (data.subCategory || {})._id;
                product.company = req.company._id;
                product.save(function (err, saved) {
                    if (err) {
                        winston.error('/admin/api/submitProduct', err);
                        return res.status(200).json({success:false,msg: locale("system_err")});
                    }
                    return res.status(200).json({success:true, data: {title: data.title, category: data.category, subCategory: data.subCategory, assets: data.assets, _id: saved._id}, _id: data._id});
                });
            });
        }
    });
    router.post('/deleteProduct', (req, res, next) => auth.company(req, res, next, ['product']) ,[
        check('_id')
            .not()
            .isEmpty()
            .withMessage(locale("error"))
            .trim()
    ],function (req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(200).json({success:false,msg: errors.array()[0].msg});
        }
        let data = matchedData(req);
        if(data._id){
            // return res.json({success: true, _id: data._id})
            SubProduct.updateMany({product:data._id, company:req.company._id}, {$set:{status:'delete'}}).exec(function (err, del){
                if(err){
                    winston.error('/api/admin/deleteProduct', err);
                    return res.status(200).json({success:false, msg: locale("error_retry"), _id:data._id});
                }
                Product.updateOne({_id:data._id, company:req.company._id}, {status:'delete'}, function (err, result) {
                    if(err){
                        winston.error('/api/admin/deleteProduct', err);
                        return res.status(200).json({success:false, msg: locale("system_err"), _id:data._id});
                    }
                    if(result.nModified){
                        return res.status(200).json({success:true, sucmod:true, msg:locale("product_routers_all.delete_success"), _id:data._id});
                    } else {
                        return res.status(200).json({success:false,msg: locale("product_routers_all.delete_error"), _id:data._id});
                    }
                });
            })
        } else {
            return res.status(200).json({success:false,msg: locale("error")});
        }
    });
    router.post('/submitSubProduct', (req, res, next) => auth.company(req, res, next, ['product']) ,[
        check('_id'),
        check('product'),
        check('price'),
        check('subAssets').custom((options, { req, location, path }) => {
            if (typeof subAssets === 'object' && subAssets && Array.isArray(subAssets) && subAssets.length) {
                return false;
            } else {
                return true;
            }
        })
        .withMessage(locale("product_routers_all.subAssetError.insert")),
    ],function (req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(200).json({success:false,msg: errors.array()[0].msg});
        }
        let data = matchedData(req);
        if(data.product && data.product._id){
            if(data._id){ //update sub Product
                SubProduct.updateOne(
                    {_id:data._id, company:req.company._id},
                    {
                        product: (data.product || {})._id,
                        subAssets: (data.subAssets || []).map(subAsset => subAsset._id),
                        price: data.price || 0
                    },
                    function (err, result) {
                        if (err) {
                            winston.error('/api/admin/submitSubProduct', err);
                            return res.status(200).json({success:false,msg: locale("system_err")});
                        }
                        return res.status(200).json({ success:true, _id: data._id, data: data });
                    });
            } else { //new sub Product
                let subProduct = new SubProduct();
                subProduct.product = data.product._id;
                subProduct.company = req.company._id;
                subProduct.price = data.price || 0;
                subProduct.subAssets = (data.subAssets || []).map(subAsset => subAsset._id);
                subProduct.save(function (err, saved) {
                    if (err) {
                        winston.error('/admin/api/submitSubProduct', err);
                        return res.status(200).json({success:false,msg: locale("system_err")});
                    }
                    return res.status(200).json({success:true, data: {...data, _id: saved._id}});
                });
            }
        } else {
            return res.status(200).json({success:false, msg:locale("error_retry")});
        }
    });
    router.post('/deleteSubProduct', (req, res, next) => auth.company(req, res, next, ['product']) ,[
        check('_id')
            .not()
            .isEmpty()
            .withMessage(locale("error"))
            .trim(),
        check('catId')
            .not()
            .isEmpty()
            .withMessage(locale("error"))
            .trim()
    ],function (req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(200).json({success:false,msg: errors.array()[0].msg});
        }
        let data = matchedData(req);
        if(data._id && data.catId){
            SubProduct.findOneAndUpdate({_id:data._id, company:req.company._id}, {$set:{status:'delete'}}).exec(function (err, del){
                if(err){
                    winston.error('/api/admin/deleteProduct', err);
                    return res.status(200).json({success:false, msg: locale("error_retry"), _id:data._id});
                }
                return res.status(200).json({success:true, sucmod:true, msg:locale("product_routers_all.delete_success"), _id:data._id, catId:data.catId});
            })
        } else {
            return res.status(200).json({success:false,msg: locale("error")});
        }
    });
};