import winston from 'winston';
import async from 'async';
import {check, validationResult} from "express-validator/check";
import {matchedData} from "express-validator/filter";
import auth from "../../auth";
import Lesson from "../../models/Lesson";
import Department from "../../models/Department";
import LessonPublish from "../../models/LessonPublish";
import Transaction from "../../models/Transaction";
import User from "../../models/User";
import Category from "../../models/Category";
import NodeCache from "node-cache";
import Roles from "../../models/Roles";
import {winsErr} from "../../config";
const myCache = new NodeCache({deleteOnExpire: false});
// import Bundle from "../../models/Bundle";
let slug = require('slug');
var ObjectId = require('mongoose').Types.ObjectId;
import {locale} from "../../lang";

module.exports = function (router) {
    router.get('/getDepartment', (req, res, next) => auth.company(req, res, next, ['edit_company_informations']), function(req, res){
        let que = {status:'active', company:req.company._id};
        async.parallel([
            function (callback) {
                Department.find(que)
                    .skip((parseInt(req.query.pageNum)*parseInt(req.query.pageSize)))
                    .limit(parseInt(req.query.pageSize))
                    .exec( function(err,result) {
                    callback(err, result)
                });
            },
            function (callback) {
                // Department.count(que).exec( function(err,result) {
                Department.countDocuments(que).exec( function(err,result) {
                    callback(err, result)
                });
            },
        ],function (err, results) {
            if(err){
                winston.error('/api/company/getCategories', err);
                return res.status(200).json({success:false, msg: locale("system_err"), err});
            }
            return res.status(200).json({ success:true, departments:(results[0] || []), all:(results[1] || 0) });
        })
    });
    router.post('/submitDepartment', (req, res, next) => auth.company(req, res, next, ['edit_company_informations']), [
        check('_id'),
        check('title')
            .not()
            .isEmpty()
            .withMessage(locale("department_routers_all.department_name_empty"))
            .trim(),
    ], function(req, res){
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(200).json({success:false,msg: errors.array()[0].msg});
        }
        let data = matchedData(req);

        if(data._id){ //update dep request
            Department.findOne(
                {_id:data._id, company:req.company._id},
                function (err, result) {
                    if (err) {
                        winston.error('/api/company/submitDepartment', err);
                        return res.status(200).json({success:false,msg: locale("system_err")});
                    }
                    if(result){
                        result.title= data.title;
                        result.save(function (err, dd) {
                            if (err) {
                                winston.error('/api/company/submitDepartment', err);
                                return res.status(200).json({success:false,msg: locale("system_err")});
                            }
                            return res.status(200).json({ success:true, _id: data._id, data: data });
                        });
                    } else {
                        return res.status(200).json({success:true});
                    }
                });
        } else { //new dep request
            let depReq = new Department();
            depReq.title = data.title;
            depReq.company = req.company._id;
            depReq.save(function (err) {
                if (err) {
                    winston.error('/api/company/submitDepartment', err);
                    return res.status(200).json({success:false,msg: locale("system_err")},err);
                }
                return res.status(200).json({success:true, data: {...depReq._doc}, _id: data._id});
            });
        }
    });
};