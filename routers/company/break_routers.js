import winston from 'winston';
import async from 'async';
import auth from "../../auth";
import User from "../../models/User";
import Employee from "../../models/Employee";
import Break from "../../models/Break";
import NodeCache from "node-cache";
import {winsErr} from "../../config";
const myCache = new NodeCache({deleteOnExpire: false});
import {locale} from "../../lang";
let slug = require('slug');
let ObjectId = require('mongoose').Types.ObjectId;

module.exports = function (router) {
    router.get('/break/all', (req, res, next) => auth.company(req, res, next, ['deal_with_break']), function(req, res){
        const companyId = (req.company || {})._id;
        const {pageSize, page} = req.query;

        async.parallel({
            allRequests: function(callbac){
                Break.find({company: companyId, status: {$ne: 'deleted'}}).deepPopulate(['employee.emp', 'employee.user', 'approved_by.emp', 'approved_by.user']).skip((page || 0)*(pageSize || 10)).limit((parseInt(pageSize) || 10)).sort({'created': 'desc'}).exec(function(err, brks){
                    // if(err){
                    //     winsErr(req, res, 'breaks.find()');
                    //     return res.json({success: false, sucmod: false, msg: locale("system_err")});
                    // }
                    callbac(err, brks);
                    // return res.json({success: true, breaks: brks});
                });
            },
            allCount: function(callbac){
                // Break.count({company: companyId, status: {$ne: 'deleted'}}, function(err, count){
                Break.countDocuments({company: companyId, status: {$ne: 'deleted'}}, function(err, count){
                   callbac(err, count);
                });
            }
        }, function (err, data) {
            if(err){
                winsErr(req, res, 'breaks.find()');
            }
            if(data){
                return res.json({success: true, breaks: data.allRequests, all: data.allCount})
            }else{
                return res.json({success: false, breaks: [], all: 0});
            }
        })
    });
    router.post('/break/response', (req, res, next) => auth.company(req, res, next, ['deal_with_break']), function(req, res){
        const {emp, id, status} = (req.body || {});
        Break.findOne({_id: id, status: {$nin: ['deleted', 'approved', 'declined']}}).exec(function(err, brk){
            if(err){
                winsErr(req, res, 'break_response.find()');
                return res.json({success: false, sucmod: false, msg: `${locale("system_err")} 1`});
            }
            if(brk){
                brk.status = status;
                brk.approved_by = {emp: ((req.employee || {})._id || emp), user: (req.user || {})._id};
                brk.save((err, brkSaved) => {
                    if(err){
                        winsErr(req, res, 'break_response.save()');
                        return res.json({success: false, sucmod: false, msg: `${locale("system_err")}2`});
                    }
                    return res.json({success: true, _id: id, user: req.user, employee: req.employee, status: status});
                    // Break.find({company: (req.company || {})._id, status: {$ne: 'deleted'}}).deepPopulate(['employee.emp', 'employee.user', 'approved_by.emp', 'approved_by.user']).sort({'created': 'desc'}).exec(function(err, brks){
                    //     if(err){
                    //         winsErr(req, res, 'breaks.find()');
                    //         return res.json({success: false, sucmod: false, msg: `${locale(system_err)} 3`});
                    //     }
                    //     return res.json({success: true, breaks: brks});
                    // });
                })
            }else{
                return res.json({success: false, sucmod: false, msg: locale("break_routers_all.break_not_found"), notFound: id})
            }
        });
    });
};