import { winsErr } from '../../config'
import async from 'async';
import auth from '../../auth';
const Employee = require("../../models/Employee");
const Report = require("../../models/report")
import {locale} from "../../lang";

module.exports = function(router){
    router.post('/delete/report',(req, res, next) => auth.employee(req, res, next), (req, res) => {
        const { _id, emp, isRemove } = req.body || {};
        if(_id && emp ){
            if(isRemove){
                Report.updateOne(
                    { 
                        $and: [ {_id: _id}, {'created_by.emp': req.employee._id} ]
                    },
                    { $set: { 'created_by.delete': true } }
                ).exec(function(err, report){
                    if(err){
                        winsErr(err, res, '/delete/report');
                        return res.json({success: false, msg: locale("system_err")});
                    }
                    if(report.ok === 1){
                        return res.json({success: true, isCreated: true, _id})
                    }
                })
            }
            else{
                Report.findOneAndUpdate({ $and: [
                    {_id: _id}, {'created_by.emp': emp}
                ] }, {status: 'delete'} ).exec(function(err, changed){
                    if(err){
                        winsErr(req, res, '/delete/report');
                        return res.json({success: false, msg: locale("system_err")});
                    }
                    if(changed){
                        return res.json({success: true, isCreated: true, _id});
                    }
                    else{
                        /* Хүлээн авагч эсэх */
                        Report.updateOne(
                            {$and: [ {_id: _id}, {'shared_to.emp': emp} ]},
                            { $set: { 'shared_to.$.delete': true } }
                        ).exec(function(err, report){
                            if(err){
                                winsErr(req, res, '/delete/report');
                                return res.json({success: false, msg: locale("system_err")});
                            }
                            if(report.ok === 1){
                                return res.json({success: true, isCreated: false, _id});
                            }
                            return res.json({success: false, msg: locale("error")})
                        })
                    }
                })
            }
        }else{
            return res.json({success: false, msg: locale("error")});
        }
        
    })

    router.post('/get/report',auth.employee, (req, res) => {
        const { pageSize = 10, pageNum = 0, emp, type }  = (req.body || {});
        const createdQu = { $and: [
                {status: {$ne: 'delete'}}, { 'created_by.emp': emp }, { 'created_by.delete': false }
            ]};
        const recievedQu = { $and: [
                {status: {$ne: 'delete'}},  {'shared_to': { $elemMatch: {'emp' : emp, 'delete':false} }}
            ]};
        if(type === 'all'){
            async.parallel({
                created: function(cb){
                    Report.find(createdQu).deepPopulate([
                        'shared_to.emp', 'shared_to.user', 'created_by.emp', 'created_by.user'
                    ]).sort({created: -1}).lean().limit(pageSize).skip(pageSize * pageNum).exec(
                        function(err, report){
                            cb(err, report)
                        }
                    )
                },
                totalCreated: function(cb){
                    Report.countDocuments(createdQu).exec(function(err, count){
                        cb(err, count);
                    })
                },
                received: function(cb){
                    Report.find(recievedQu).deepPopulate([
                        'shared_to.emp', 'shared_to.user', 'created_by.emp', 'created_by.user'
                    ]).sort({created: -1}).lean().limit(pageSize).skip(pageSize * pageNum).exec(
                        function(err, report){
                            cb(err, report)
                        }
                    )
                },
                totalReceived: function(cb){
                    Report.countDocuments(recievedQu).exec(function(err, count){
                        cb(err, count);
                    })
                }
            }, function(err, data){
                if(err){
                    winsErr(req, err, '/get/report');
                    return res.json({
                        success: true, 
                        type,
                        created: [], 
                        totalCreated: 0, 
                        received: [], 
                        totalReceived: 0
                    })
                }
                if(data){
                    return res.json({
                        success: !err, 
                        created: data.created, totalCreated: data.totalCreated,
                        received: data.received, totalReceived: data.totalReceived
                    })
                }
                return res.json({
                    success: true, 
                    type,
                    created: [], 
                    totalCreated: 0, 
                    received: [], 
                    totalReceived: 0
                })
            })
        } else {
            let qu = {};
            if(type === 'created'){
                qu = createdQu;
            } else {
                qu = recievedQu;
            }
            async.parallel({
                created: function(cb){
                    Report.find(qu).deepPopulate([
                        'shared_to.emp', 'shared_to.user', 'created_by.emp', 'created_by.user'
                    ]).sort({created: -1}).lean().limit(pageSize).skip(pageSize * pageNum).exec(
                        function(err, report){
                            cb(err, report)
                        }
                    )
                },
                totalCreated: function(cb){
                    Report.countDocuments(qu).exec(function(err, count){
                        cb(err, count);
                    })
                }
            }, function(err, data){
                if(err){
                    winsErr(req, err, '/get/report');
                    return res.json({
                        success: false
                    })
                }
                return res.json({
                    success: true,
                    data: data.created || [],
                    all: data.totalCreated || 0
                })
            })
        }

    })



    router.post('/change/report',(req, res, next) => auth.employee(req, res, next), (req, res) => {
        let { title, description, sharedEmps, createdBy, _id, emp } = (req.body || {});
        if(_id && emp){
            Report.updateOne(
                {$and: [ {_id: _id}, {'shared_to.emp': emp} ]},
                { $set: { 'shared_to.$.viewed': true } }
            ).exec(function(err, report){
                if(err){
                    winsErr(req, res, '/change/report');
                    return res.json({success: false, msg: locale("system_err")});
                }
                if(report.ok === 1){
                    return res.json({success: true, msg: locale("report_routers_all.watch_successful")});
                }
            })
        }
        // Create
        if(!_id && _id === '' ){  
            if(!title || title === '')
                return res.json({success: false, msg: locale("report_routers_all.title_empty")});
            if(!sharedEmps || sharedEmps.length === 0)
                return res.json({success: false, msg: locale("report_routers_all.choose_employee")});
            let newReport = new Report({
                title,
                description,
                shared_to: sharedEmps,
                created_by: createdBy
            });
            newReport.save((err, newReport) => {
                if(err) winsErr(req, res, 'newReport.save()');
                Report.findOne({_id: newReport._id}).deepPopulate([
                    'shared_to.emp', 'shared_to.user', 'created_by.emp', 'created_by.user'
                ]).exec(function(err, report){
                    if(err) { winsErr(req, err, 'Report.findOne')}
                    if(report){
                        return res.json({
                            success: !(err),
                            create: true,
                            sucmod: !(err),
                            report,
                            msg: (err ? locale("report_routers_all.save_error") : locale("report_routers_all.save_success"))
                        });
                    }else {
                        return res.json({
                            success: false,
                            sucmod: false,
                            msg: locale("report_routers_all.save_error")
                        })
                    }
                })
            });
        }
        // // Edit
        // else{
        //     console.log(_id)
        //     Report.findById(_id).exec(function(err, report){
        //         if(err) return console.log(err)
        //         console.log(report)
        //     })
        // }
    })

}