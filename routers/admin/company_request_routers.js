import {winsErr} from "../../config";
import CompanyRegReq from '../../models/CompRegReq';
import Company from '../../models/Company';
import Employee from "../../models/Employee";
import User from "../../models/User";
import async from 'async'
import auth from "../../auth";

module.exports = function (router) {
    router.post('/get/requests', auth.admin, function(req, res){
        const {
            pageSize,
            pageNum,
            status
        } = req.body || {}
        let filter = {status: {$in: ['pending', 'disapprove']}};
        if(status && status !== '' && status !== 'all'){
            filter = {status: status};
        }
        async.parallel({
            allReqs: function(callback) {
                Company.find(filter).lean()
                    .limit(pageSize).skip(pageSize*pageNum).sort({created: -1})
                    .exec(function(err, reqs){
                        if(err) {winsErr(req, res, 'Company.find()')}
                        callback(err, reqs)
                    })
            },
            allCount: function(callback) {
                // CompanyRegReq.count({status: status}).exec(function(err, count){
                Company.countDocuments(filter).exec(function(err, count){
                    if(err) {winsErr(req, res, 'Company.count()')}
                    callback(err, count)
                })
            }
        }, (err, data) => {
            if(err) {winsErr(req, res, '/get/requests callback')}
            Employee.find({status: 'active', staticRole: 'lord', company: {$in: (data.allReqs || []).map(req => req._id)}})
                .deepPopulate('user').lean().exec(function(err, emps){
                if(err) {winsErr(req, res, '/get/requests callback')}
                data.allReqs = (data.allReqs || []).map(req => {
                    let matched = {};
                    (emps || []).map(emp => {
                        (emp.company || 'as').toString() === (req._id || '').toString() ? matched = emp : null;
                    })
                    return {
                        ...req,
                        lord: matched
                    }
                });
                return res.json({success: !(err), requests: data.allReqs, all: data.allCount});
            });
        })

    });
    router.post('/set/companyReqStatus', auth.admin, function (req, res) {
        if (req.body.id.match(/^[0-9a-fA-F]{24}$/)) {
            Company.findOne({_id: req.body._id}, function (err, request) {
                if (err) {
                    winsErr(req, res, '/set/companyReqStatus 1');
                    res.json({
                        success: true,
                        sucmod: !(err),
                        msg: (err ? 'Үйлдэл амжилтгүй.' : 'Үйлдэл амжилттай хийгдлээ'),
                        request: request
                    });
                }
                if (request) {
                    if(
                        (request.status === 'pending' && req.body.status !== 'disapprove' && req.body.status !== 'active') ||
                        (request.status === 'decline' && req.body.status !== 'active')
                    ){
                        return res.json({success: false, msg: 'Төлөв буруу байна', request: request});
                    }
                    request.status = req.body.status;
                    request.save((err, saved) => {
                        if (err) {
                            winsErr(req, res, '/set/companyReqStatus 2');
                            res.json({
                                success: true,
                                sucmod: !(err),
                                msg: (err ? 'Үйлдэл амжилтгүй.' : 'Үйлдэл амжилттай хийгдлээ'),
                                request: request
                            });
                        }
                        res.json({
                            success: true,
                            sucmod: !(err),
                            msg: (err ? 'Үйлдэл амжилтгүй.' : 'Үйлдэл амжилттай хийгдлээ'),
                            request: saved._doc
                        });
                    });
                } else {
                    res.json({success: false, msg: 'Компани олдсонгүй'});
                }
            })
        }
    })
}