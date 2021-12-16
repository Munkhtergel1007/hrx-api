import moment from "moment";
let async = require('async');
let auth = require('../../auth');
let Employee = require('../../models/Employee');
let MassAttendance = require('../../models/MassAttendance');
const checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");
import {locale} from "../../lang";
import winston from 'winston';
module.exports = function (router) {
    router.get('/getStudentsGuard', auth.massAttendance,function(req,res){
        let startingz = new Date();
        let endingz = new Date();
        startingz.setHours(0, 0, 0, 0);
        endingz.setHours(0, 0, 0, 0);
        endingz.setDate( endingz.getDate() + 1 );
        endingz.setMilliseconds( endingz.getMilliseconds() - 1 );
        let rangePickerQu = {$and:[{localTime: {$gte: startingz}} , {localTime: {$lte: endingz}}]};
        async.parallel([
                function (callback) {
                    Employee.find({$and:[ {company:{$in: [...(req.subsidiaries || []), req.company._id]}} , {status:'active'} ]}, {_id:1, cardId:1, company: 1, user:1, staticRole: 1, timetable:1 }).deepPopulate(['user', 'timetable', 'user.avatar']).lean().exec(function (err, data) {
                        callback(err, data);
                    });
                },
                function (callback){
                    // MassAttendance.find({$and:[ {company:req.erp._id} , {status:'active'}, rangePickerQu ]}).sort({localTime:-1}).skip( (parseInt(req.query.pageSize) * parseInt(req.query.pageNum)) ).limit( parseInt(req.query.pageSize) ).deepPopulate(['employee']).lean().exec(function (err, data) {
                    MassAttendance.find({$and:[ {company:{$in: [...(req.subsidiaries || []), req.company._id]}} , {status:'active'}, {byManager: {$ne: true}}, rangePickerQu ]}).sort({localTime:-1}).deepPopulate(['employee', 'user', 'timetable']).lean().exec(function (err, data) {
                        callback(err, data);
                    });
                },
                function (callback){
                    // MassAttendance.count({$and:[ {company:req.company._id} , {status:'active'}, rangePickerQu ]}).lean().exec(function (err, data) {
                    MassAttendance.countDocuments({$and:[ {company:{$in: [...(req.subsidiaries || []), req.company._id]}} , {status:'active'}, rangePickerQu ]}).lean().exec(function (err, data) {
                        callback(err, data);
                    });
                }
            ],
            function (err, stds) {
                if(err){
                    winston.error('/getStudentsGuard',err);
                    return res.json({success:false, msg:locale("system_err")});
                }
                let allTeacher = 0, allStudent = 0, allStudentAtt = [], allTeacherAtt = [];
                if(stds[0] && stds[0].length>0){
                    stds[0].map(function (r) {
                        if(r.role && r.role.length){
                            if(r.role.includes('student')){
                                allStudent = allStudent + 1;
                            } else if(r.role.includes('teacher')) {
                                allTeacher = allTeacher + 1;
                            }
                        }
                    });
                }
                if(stds[1] && stds[1].length>0){
                    stds[1].map(function (r) {
                        if(r.employee && r.employee.role && r.employee.role.length){
                            if(r.employee.role.includes('student')){
                                if(allStudentAtt && allStudentAtt.length>0){
                                    if(!(allStudentAtt || []).some(s => (s._id || '').toString() === r.employee._id.toString())){
                                        allStudentAtt.push({_id: r.employee._id});
                                    }
                                } else {
                                    allStudentAtt = [{_id: r.employee._id}];
                                }
                            } else if(r.employee.role.includes('teacher')) {

                                if(allTeacherAtt && allTeacherAtt.length>0){
                                    if(!(allTeacherAtt || []).some(s => (s._id || '').toString() === r.employee._id.toString())){
                                        allTeacherAtt.push({_id: r.employee._id});
                                    }
                                } else {
                                    allTeacherAtt = [{_id: r.employee._id}];
                                }
                            }
                        }
                    });
                }
                return res.json({success:true, members: (stds[0] || []), att: (stds[1] || []).slice(0, 50), all: (stds[2] || 0), allTeacher: allTeacher, allStudent: allStudent, allStudentAtt: (allStudentAtt || []), allTeacherAtt: (allTeacherAtt || [])  });
            });
    });
    router.post('/insertMassAttendance',auth.massAttendance,function(req,res){
        MassAttendance.insertMany(req.body.records , function(err , ins){
            if(err){
                winston.error('/insertMassAttendance error', err);
                return res.json({success: false, msg: locale("system_err"), records: req.body.records});
            }
            return res.json({ success:true, records: req.body.records});
        })
    });
    router.post('/insertMassAttendanceOneByOne',auth.massAttendance,function(req,res){
        MassAttendance.insertMany(req.body.records , function(err , ins){
            if(err){
                winston.error('/insertMassAttendanceOneByOne error', err);
                return res.json({success: false, msg: locale("system_err"), records: req.body.records});
            }
            return res.json({ success:true, records: req.body.records});
        })
    });
    router.post('/registerStudentGuardOneByOne',auth.massAttendance,function(req,res){
        console.log(req.body.newRecord)
        if(req.body.newRecord && req.body.newRecord.employee && req.body.newRecord.company){
            Employee.findOne({$and:[ {company:{$in: [...(req.subsidiaries || []), req.company._id]}} , {status:'active'} , {cardId:req.body.id} ]}, {name:1, last_name:1, cardId:1, _id:1, group:1, avatar:1, user:1}).deepPopulate(['user', 'user.avatar']).exec(function (err, stud) {
                if(err){
                    winston.error('/registerStudentGuardOneByOne error', err);
                    return res.json({success: false, msg: locale("system_err"), id: req.body.id, localTime: req.body.localTime, aldaa:'sys_err'});
                }
                if(stud){
                    let hold = {
                        employee: stud._id,
                        localTime: req.body.localTime,
                        company: stud.company,
                        user: stud.user._id
                    };
                    MassAttendance.insertMany([req.body.newRecord] , function(err , ins){
                        if(err){
                            winston.error('/registerStudentGuardOneByOne error', err);
                            return res.json({success: false, msg: locale("system_err"), id: req.body.id, localTime: req.body.localTime, aldaa:'sys_err'});
                        }
                        return res.json({ success:true, id: req.body.id, localTime: req.body.localTime, stud:stud, ins:ins, newRecord:req.body.newRecord});
                    })
                } else {
                    return res.json({ success:false, id: req.body.id, localTime: req.body.localTime, aldaa:'unregistered'});
                }
            });
        } else {
            return res.json({ success:false, id: req.body.id, localTime: req.body.localTime, aldaa:'aldaa' });
        }
    });
};
