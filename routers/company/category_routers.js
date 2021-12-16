import winston from 'winston';
import async from 'async';
import {check, validationResult} from "express-validator/check";
import {matchedData} from "express-validator/filter";
import auth from "../../auth";
import Category from "../../models/Category";
import SubCategory from "../../models/SubCategory";
let slug = require('slug');
import {locale} from "../../lang";

module.exports = function (router) {
    router.get('/getCategory', auth.company ,function (req, res) {
        let searchQu = {status:'active', company:req.company._id};
        if(req.query.search && req.query.search !==''){
            let regex = new RegExp(".*"+req.query.search+'.*', "i");
            searchQu = {$and: [ {status:'active'} , {$or:[ {title:regex} ]} ]};
        }
        async.parallel([
            function (callback) {
                Category.find(searchQu)
                    .sort({created: -1})
                    .skip((parseInt(req.query.pageNum)*parseInt(req.query.pageSize)))
                    .limit(parseInt(req.query.pageSize))
                    .deepPopulate(['created_by'])
                    .lean()
                    .exec( function(err,result) {
                        async.map(result, function(item, cb){
                            SubCategory.find({category: item._id, status:'active'}).sort({created: -1}).lean().exec(function(errT, subCat){
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
                Category.count(searchQu).exec( function(err,result) {
                    callback(err, result)
                });
            },
        ],function (err, results) {
            if(err){
                winston.error('/api/admin/getCategory', err);
                return res.status(200).json({success:false, msg: locale("system_err"), err});
            }
            return res.status(200).json({success:true, categories:(results[0] || []), all:(results[1] || 0) });
        })
    });
    router.post('/submitCategory', (req, res, next) => auth.company(req, res, next, ['category']) ,[
        check('_id'),
        check('title')
            .not()
            .isEmpty()
            .withMessage(locale("name_empty"))
            .trim()
    ],function (req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(200).json({success:false,msg: errors.array()[0].msg});
        }
        let data = matchedData(req);
        if(data._id){ //update category
            Category.updateOne(
                {_id:data._id, company:req.company._id},
                {
                    title: data.title,
                },
                function (err, result) {
                if (err) {
                    winston.error('/api/admin/submitCategory', err);
                    return res.status(200).json({success:false,msg: locale("system_err")});
                }
                if(result.nModified){
                    return res.status(200).json({ success:true, _id: data._id, data:data });
                } else {
                    return res.status(200).json({success:false, msg: locale("error")});
                }
            });
        } else { //new category
            let holdSlug = slug(data.title);
            let regex = new RegExp("^"+holdSlug, "i");
            Category.find({slug:regex},function (err, slugs) {
                if (err) {
                    winston.error('/api/admin/submitCategory', err);
                    return res.status(200).json({ success:false,msg: locale("system_err"), err });
                }
                if(slugs && slugs.length>0){
                    holdSlug = `${holdSlug}-${slugs.length}`
                }
                let category = new Category();
                category.slug = holdSlug;
                category.title = data.title;
                category.created_by = req.user._id;
                category.company = req.company._id;
                category.save(function (err) {
                    if (err) {
                        winston.error('/admin/api/submitCategory', err);
                        return res.status(200).json({success:false,msg: locale("system_err")});
                    }
                    return res.status(200).json({success:true, data: {...category._doc, created_by:req.user}, _id: data._id});
                });
            });
        }
    });
    router.post('/deleteCategory', (req, res, next) => auth.company(req, res, next, ['category']) ,[
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
            SubCategory.updateMany({category:data._id, company:req.company._id}, {$set:{status:'delete'}}).exec(function (err, del){
                if(err){
                    winston.error('/api/admin/deleteCategory', err);
                    return res.status(200).json({success:false, msg: locale("error_retry"), _id:data._id});
                }
                Category.updateOne({_id:data._id, company:req.company._id}, {status:'delete'}, function (err, result) {
                    if(err){
                        winston.error('/api/admin/deleteCategory', err);
                        return res.status(200).json({success:false, msg: locale("system_err"), _id:data._id});
                    }
                    if(result.nModified){
                        return res.status(200).json({success:true, sucmod:true, msg:locale("action_success"), _id:data._id});
                    } else {
                        return res.status(200).json({success:false,msg: locale("action_failed"), _id:data._id});
                    }
                });
            })
        } else {
            return res.status(200).json({success:false,msg: locale("error")});
        }
    });
    router.post('/submitSubCategory', (req, res, next) => auth.company(req, res, next, ['category']) ,[
        check('_id'),
        check('category'),
        check('title')
            .not()
            .isEmpty()
            .withMessage(locale("name_empty"))
            .trim()
    ],function (req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(200).json({success:false,msg: errors.array()[0].msg});
        }
        let data = matchedData(req);
        if(data.category && data.category._id){
            if(data._id){ //update sub category
                SubCategory.updateOne(
                    {_id:data._id, company:req.company._id},
                    {
                        title: data.title,
                    },
                    function (err, result) {
                        if (err) {
                            winston.error('/api/admin/submitSubCategory', err);
                            return res.status(200).json({success:false,msg: locale("system_err")});
                        }
                        if(result.nModified){
                            return res.status(200).json({ success:true, _id: data._id, data: {...data, category:data.category._id} });
                        } else {
                            return res.status(200).json({success:false, msg: locale("error")});
                        }
                    });
            } else { //new sub category
                let holdSlug = slug(data.title);
                let regex = new RegExp("^"+holdSlug, "i");
                SubCategory.find({slug:regex},function (err, slugs) {
                    if (err) {
                        winston.error('/api/admin/submitCategory', err);
                        return res.status(200).json({ success:false,msg: locale("system_err"), err });
                    }
                    if(slugs && slugs.length>0){
                        holdSlug = `${holdSlug}-${slugs.length}`
                    }
                    let subCategory = new SubCategory();
                    subCategory.slug = holdSlug;
                    subCategory.title = data.title;
                    subCategory.category = data.category._id;
                    subCategory.created_by = req.user._id;
                    subCategory.company = req.company._id;
                    subCategory.save(function (err) {
                        if (err) {
                            winston.error('/admin/api/submitSubCategory', err);
                            return res.status(200).json({success:false,msg: locale("system_err")});
                        }
                        return res.status(200).json({success:true, data: {...subCategory._doc, created_by:req.user}, _id: data._id});
                    });
                });
            }
        } else {
            return res.status(200).json({success:false, msg:locale("error_retry")});
        }
    });
    router.post('/deleteSubCategory', (req, res, next) => auth.company(req, res, next, ['category']) ,[
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
            SubCategory.findOneAndUpdate({_id:data._id, company:req.company._id}, {$set:{status:'delete'}}).exec(function (err, del){
                if(err){
                    winston.error('/api/admin/deleteCategory', err);
                    return res.status(200).json({success:false, msg: locale("error_retry"), _id:data._id});
                }
                return res.status(200).json({success:true, sucmod:true, msg:locale("action_success"), _id:data._id, catId:data.catId});
            })
        } else {
            return res.status(200).json({success:false,msg: locale("error")});
        }
    });
};