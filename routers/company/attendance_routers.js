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
import Employee from "../../models/Employee";
import MassAttendance from "../../models/MassAttendance";
import Vacation from "../../models/Vacation";
import Break from "../../models/Break";
import NodeCache from "node-cache";
import {locale} from "../../lang";
import Roles from "../../models/Roles";
import {winsErr, getDatesBetweenDates, checkIfDayInGap, dayToNumber, isId, isValidDate} from "../../config";
const myCache = new NodeCache({deleteOnExpire: false});
// import Bundle from "../../models/Bundle";
let slug = require('slug');
let ObjectId = require('mongoose').Types.ObjectId;

module.exports = function (router) {
    router.get('/getAttendance', auth.employee, function(req, res){

        let hadAction = (((req.employee || {}).role || {}).actions || []).some((c) => ['see_attendance'].indexOf(c) > -1);
        let hasAccess = ((req.employee || {}).staticRole === 'lord' || (req.employee || {}).staticRole === 'hrManager' || (req.employee || {}).staticRole === 'chairman')
            || hadAction;

        let {pageNum, pageSize, search} = req.query;
        pageNum = parseInt(pageNum) || 0;
        pageSize = parseInt(pageSize) || 20;
        let filter = [{staticRole: {$in: ['lord', 'employee', 'hrManager', 'chairman']}}, {company: {$in: [...(req.subsidiaries || []), req.company._id]}}, {status:'active'}];
        let regex = new RegExp(".*"+search+'.*', "i");
        User.find({$expr:{
                $or:[
                    {$regexMatch:{
                            "input": "$first_name",
                            "regex": regex
                        }},
                    {$regexMatch:{
                            "input": "$last_name",
                            "regex": regex
                        }},
                    {$regexMatch:{
                            "input": "$username",
                            "regex": regex
                        }},
                    {$regexMatch:{
                            "input": "email",
                            "regex": regex
                        }},
                    {$regexMatch: {
                            "input": {"$toString": "$phone"},
                            "regex": regex
                        }}
                ]
            }, status: 'active'}).distinct('_id', function(err, users) {
            if(err){
                let month = new Date(req.query.selected_month).getMonth()+1;
                let year  = new Date(req.query.selected_month).getFullYear();
                let days = (getAllDaysInMonth(month-1, year) || []);
                return res.json({success: true, attendance: [], days: days, selectedMonth: req.query.selected_month, all: 0})
            }
            // if(users.length > 0){
            //     // user = users;
            //     filter.push({user: {$in: users}});
            // }
            if(req.query.selected_month){
                let month = new Date(req.query.selected_month).getMonth()+1;
                let year  = new Date(req.query.selected_month).getFullYear();
                let start_date = new Date(req.query.selected_month);
                let end_date = new Date(req.query.selected_month);
                end_date.setMonth(end_date.getMonth()+1);
                let days = (getAllDaysInMonth(month-1, year) || []);



                let massAttendanceQu = {};
                let breakFindQu = {};
                let vacationFindQu = {};
                if(!hasAccess){
                    massAttendanceQu = {employee:req.employee._id};
                    filter = [{_id:req.employee._id}];
                    breakFindQu = {'employee.emp':req.employee._id};
                    vacationFindQu = {'employee.emp':req.employee._id};
                }else {
                    if(search && search !== ''){
                        filter.push({user: {$in: users}});
                    }
                }

                async.parallel([
                    function (callback){
                        MassAttendance.aggregate([
                            {$match:{
                                    $and:[
                                        {company: {$in: [...(req.subsidiaries || []), req.company._id]}},
                                        // {'user':ObjectId('608a6fe8c27e2c0690f5b9f0')},
                                        {$or:[
                                                {'status':{$eq:'active'}},
                                                {'status':{$eq:'default'}},
                                            ]},
                                        // {$in:[ '$status' , ['active', 'default'] ]},
                                        {'localTime':{$gte:start_date}},
                                        {'localTime':{$lte:end_date}},
                                        // {{$isoDayOfWeek:'localTime'}:{$eq:6}}
                                        // {$eq:[ {$isoDayOfWeek:'$localTime'} , 7 ]}
                                        massAttendanceQu
                                    ]
                                }},
                            {$project:{
                                    _id:1,
                                    company:1,
                                    created:1,
                                    employee:1,
                                    status:1,
                                    user:1,
                                    timetable:1,
                                    localTime:1,
                                    byManager:1,
                                    manager:1,
                                    reason:1,
                                    dayOfWeek:{$isoDayOfWeek:{$toDate:{
                                                $dateToString: {
                                                    date: '$localTime',
                                                    timezone: '+08:00'
                                                }
                                            }}},
                                    year:{$year:{$toDate:{
                                                $dateToString: {
                                                    date: '$localTime',
                                                    timezone: '+08:00'
                                                }
                                            }}},
                                    month:{$month:{$toDate:{
                                                $dateToString: {
                                                    date: '$localTime',
                                                    timezone: '+08:00'
                                                }
                                            }}},
                                    day:{$dayOfMonth:{$toDate:{
                                                $dateToString: {
                                                    date: '$localTime',
                                                    timezone: '+08:00'
                                                }
                                            }}},
                                    hour:{$hour:{$toDate:{
                                                $dateToString: {
                                                    date: '$localTime',
                                                    timezone: '+08:00'
                                                }
                                            }}},
                                    minute:{$minute:{$toDate:{
                                                $dateToString: {
                                                    date: '$localTime',
                                                    timezone: '+08:00'
                                                }
                                            }}},
                                }},
                            // {$match:{'dayOfWeek':{$nin:[6, 7]}}},

                            {
                                $lookup:
                                    {
                                        from: "timetables",
                                        let: { id: "$timetable" },
                                        pipeline: [
                                            { $match:
                                                    { $expr:
                                                            { $and:
                                                                    [
                                                                        { $eq: [ "$_id",  "$$id" ] },
                                                                    ]
                                                            }
                                                    }
                                            },
                                        ],
                                        as: "timetable"
                                    }
                            },
                            { $unwind: { path: "$timetable", preserveNullAndEmptyArrays: true } },
                            {$sort:{
                                    localTime:1
                                }},
                            {$group:{
                                    _id:{employee:'$employee', year:'$year', month:'$month', day:'$day', dayOfWeek:'$dayOfWeek' },
                                    activeAtt:{$push:{
                                            $cond: { if: { $eq: [ "$status", 'active' ] }, then: '$$ROOT', else: null }
                                        }},
                                    defaultAtt:{$push:{
                                            $cond: { if: { $eq: [ "$status", 'default' ] }, then: '$$ROOT', else: null }
                                        }}
                                }},
                        ])
                            .allowDiskUse(true)
                            .exec(function (err, data) {
                                callback(err, data || []);
                            })
                    },
                    function (callback){
                        Employee.find({$and: filter}, {_id:1, user:1, staticRole:1, status:1, timetable:1, company: 1}).skip(pageNum*pageSize).limit(pageSize).deepPopulate(['user', 'company']).lean().exec(function (err, data) {
                            callback(err, data || []);
                        })
                    },
                    function (callback){
                        Break.find({
                            $and: [{company:{$in: [...(req.subsidiaries || []), req.company._id]}}, breakFindQu, {status:'approved'}, {$or: [
                                    {$and:[ {starting_date:{$gte:start_date}} , {starting_date:{$lte:end_date}} ]},
                                    {$and:[ {ending_date:{$gte:start_date}} , {ending_date:{$lte:end_date}}
                                        ]}
                                ]}]
                        })
                            .lean().exec(function (err, data) {
                            callback(err, data || []);
                        })
                    },
                    function (callback){
                        Vacation.find({
                            $and: [{company:{$in: [...(req.subsidiaries || []), req.company._id]}}, vacationFindQu, {status: 'approved'}, {$or: [
                                    {$and:[ {starting_date:{$gte:start_date}} , {starting_date:{$lte:end_date}} ]},
                                    {$and:[ {ending_date:{$gte:start_date}} , {ending_date:{$lte:end_date}}
                                        ]}
                                ]}]
                        })
                            .lean().exec(function (err, data) {
                            callback(err, data || []);
                        })
                    },
                    function (callback){
                        // Employee.countDocuments({company:req.company._id, status:'active', $and:[ {staticRole:{$ne:'attendanceCollector'}} , {staticRole:{$ne:'lord'}} , {staticRole:{$ne:'chairman'}} ]}).exec(function (err, data) {
                        Employee.countDocuments({$and: filter},).lean().exec(function (err, data) {
                            callback(err, data || []);
                        })
                    },
                ], function (err, results) {
                    if(err){
                        winston.error('/getAttendance err', err);
                        return res.status(200).json({success:false, msg: locale("system_err")});
                    }
                    // let returnItem = [];
                    // (results[0] || []).map(function (r){
                    //     r.defaultAtt = ((r.defaultAtt || []).filter(m => m) || [])[0];
                    //     r.activeAtt = (r.activeAtt || []).filter(m => m);
                    //     r.irsen = r.activeAtt.length>0 ? r.activeAtt[0] : null
                    //     if(r.irsen && r.irsen.timetable){
                    //         r.tsagiinHuvaari = r.irsen.timetable;
                    //     } else if(r.defaultAtt && r.defaultAtt.timetable){
                    //         r.tsagiinHuvaari = r.defaultAtt.timetable;
                    //     } else {
                    //         r.tsagiinHuvaari = null;
                    //     }
                    //     if(0 < (r.activeAtt || []).length-1){
                    //         r.yvsan = (r.activeAtt || [])[(r.activeAtt || []).length-1];
                    //     } else {
                    //         r.yvsan = null;
                    //     }
                    //     delete r.activeAtt;
                    //     delete r.defaultAtt;
                    // });
                    // (results[1] || []).map(function (r) {
                    //     let irts = [];
                    //     (days || []).map(function (d) {
                    //         let dayOfWeek = getDayOfWeek(year, month, d);
                    //         let workingDay = 'none';
                    //         if(dayOfWeek === 6  || dayOfWeek === 7){
                    //             workingDay = 'notWorkingDef';
                    //         } else {
                    //             workingDay = 'workingDef';
                    //         }
                    //         irts.push({day: d, dayOfWeek: dayOfWeek, timeline:null, arrived:false, workingDay:workingDay, late:null, early:null,  irsen:null, yvsan:null, type:null, reason: null, reasonBreakInfo:{}, reasonVacationInfo:{}});
                    //     });
                    //     returnItem.push({employee:r, irts:irts});
                    // });
                    // // -*- Vacation START
                    // (results[3] || []).map(function (b) {
                    //     let days= [];
                    //     if(b.selected_dates && b.selected_dates.length>0){
                    //         days = b.selected_dates;
                    //     } else {
                    //         days = getDatesBetweenDates(b.starting_date, b.ending_date);
                    //     }
                    //     (returnItem || []).map(function (ret) {
                    //         if((b.employee.emp || 'aa').toString() === (ret.employee._id || 'bb').toString()){
                    //             ret.irts.map(function (irts) {
                    //                 if(checkIfDayInGap(req.query.selected_month+'/'+irts.day, days)){
                    //                     irts.reasonVacationInfo = b;
                    //                     irts.reason = 'vacation';
                    //                     // irts.workingDay = 'vacation';
                    //                 }
                    //             });
                    //         }
                    //     });
                    // });
                    // // -*- Vacation END
                    // // -*- Break START
                    // (results[2] || []).map(function (b) {
                    //     let days = getDatesBetweenDates(b.starting_date, b.ending_date);
                    //     (returnItem || []).map(function (ret) {
                    //         if((b.employee.emp || 'aa').toString() === (ret.employee._id || 'bb').toString()){
                    //             ret.irts.map(function (irts) {
                    //                 if(
                    //                     irts.reason !== 'vacation' &&
                    //                     checkIfDayInGap(req.query.selected_month+'/'+irts.day, days)){
                    //                     irts.reasonBreakInfo = b;
                    //                     irts.reason = 'break';
                    //                     // irts.workingDay = 'break';
                    //                 }
                    //             });
                    //         }
                    //     });
                    // });
                    // // -*- Break END
                    // (results[0] || []).map(function (att) {
                    //     (returnItem || []).map(function (ret) {
                    //         if(att._id.employee.toString() === ret.employee._id.toString()){
                    //             ret.irts.map(function (irts) {
                    //                 if(
                    //                     // (irts.reason !=='vacation' && irts.reason !=='break') &&
                    //                     att._id.day === irts.day
                    //                 ){
                    //                     if(att.tsagiinHuvaari && att.tsagiinHuvaari.days && att.tsagiinHuvaari.days.length>0){
                    //                         irts.workingDay = 'notWorking';
                    //                         irts.tsagiinHuvaari = att.tsagiinHuvaari;
                    //                         att.tsagiinHuvaari.days.map(function (r) {
                    //                             if(irts.dayOfWeek === dayToNumber(r.title)){
                    //                                 irts.workingDay = 'working';
                    //                                 let workingHour = (r.startingHour || '').split(':');
                    //                                 let workingHourEnd = (r.endingHour || '').split(':');
                    //                                 // let totalWorkHour = calTotalWorkHour(r.startingHour, r.endingHour)
                    //                                 if(att.irsen){
                    //                                     if(att.irsen.hour < parseInt(workingHour[0])){
                    //                                         irts.late = false;
                    //                                     } else if(att.irsen.hour === parseInt(workingHour[0]) && att.irsen.minute <= parseInt(workingHour[1])){
                    //                                         irts.late = false;
                    //                                     } else {
                    //                                         irts.late = true;
                    //                                     }
                    //                                 }
                    //                                 if(att.yvsan && att.yvsan != null && typeof att.yvsan != 'unidentified'&& typeof att.yvsan === 'object'){
                    //                                     if(att.yvsan.hour > parseInt(workingHourEnd[0])){
                    //                                         irts.early = false;
                    //                                     } else if(att.yvsan.hour === parseInt(workingHourEnd[0]) && att.yvsan.minute >= parseInt(workingHourEnd[1])){
                    //                                         irts.early = false;
                    //                                     } else {
                    //                                         irts.early = true;
                    //                                     }
                    //                                 } else {
                    //                                     irts.early = false;
                    //                                 }
                    //                             }
                    //                         });
                    //                     } else {
                    //                         // if(irts.workingDay !== 'working'){
                    //                         //     irts.workingDay = 'notWorking';
                    //                         // }
                    //                         if(att.irsen){
                    //                             if(att.irsen.hour < 10){
                    //                                 irts.late = false;
                    //                             } else if(att.irsen.hour === 10 && att.irsen.minute <= 0){
                    //                                 irts.late = false;
                    //                             } else {
                    //                                 irts.late = true;
                    //                             }
                    //                         }
                    //                         if(att.yvsan){
                    //                             if(att.yvsan.hour > 18){
                    //                                 irts.early = false;
                    //                             } else if(att.yvsan.hour === 18 && att.yvsan.minute >= 0){
                    //                                 irts.early = false;
                    //                             } else {
                    //                                 irts.early = true;
                    //                             }
                    //                         } else {
                    //                             irts.early = false;
                    //                         }
                    //                     }
                    //                     irts.arrived = !!att.irsen;
                    //                     irts.irsen = att.irsen;
                    //                     irts.yvsan = att.yvsan;
                    //                     // irts.activeAtt = att.activeAtt;
                    //                     // irts.defaultAtt = att.defaultAtt;
                    //                     irts.timeline = att.timeline;
                    //                     if(att.irsen && att.yvsan && (att.irsen._id || 'i').toString() !== (att.yvsan._id || 'y').toString()){
                    //                         irts.yvsan = att.yvsan;
                    //                     }
                    //
                    //                     let hours = 0;
                    //                     let mins = 0;
                    //                     let secs = 0;
                    //                     if(irts.irsen && irts.irsen.localTime && irts.yvsan && irts.yvsan.localTime){
                    //                         let dayA = new Date(irts.irsen.localTime);
                    //                         let dayB = new Date(irts.yvsan.localTime);
                    //                         let diff =( dayB.getTime() - dayA.getTime() ) / 1000;
                    //                         hours = Math.floor(diff / 60 / 60);
                    //                         mins = Math.floor((diff - (hours * 60 * 60)) / 60);
                    //                         secs = Math.floor((diff - ((hours * 60 * 60) + (mins * 60) )));
                    //                     }
                    //                     if(!irts.yvsan){
                    //                         irts.noYvsanHour = 1;
                    //                     }
                    //                     irts.hours = hours;
                    //                     irts.mins = mins;
                    //                     irts.secs = secs;
                    //                 }
                    //             });
                    //         }
                    //     });
                    // });
                    //
                    // (returnItem || []).map(function (ret) {
                    //     let totalWorkedHour = 0;
                    //     let totalWorkedMin = 0;
                    //     let totalWorkedSec = 0;
                    //     let noYvsanHour = 0;
                    //     let totalWorkDay = 0;
                    //     let totalArrivedDay = 0;
                    //     let totalBreakDay = 0;
                    //     let totalVacationDay = 0;
                    //     let totalHours = 0;
                    //     let totalLate = 0;
                    //     let totalEarly = 0;
                    //
                    //     (ret.irts || []).map(function (irts) {
                    //         totalWorkedHour += (irts.hours || 0);
                    //         totalWorkedMin += (irts.mins || 0);
                    //         totalWorkedSec += (irts.secs || 0);
                    //         noYvsanHour += (irts.noYvsanHour || 0);
                    //         totalArrivedDay += irts.arrived ? 1 : 0;
                    //
                    //         if(irts.workingDay === 'working' || irts.workingDay === 'workingDef'){
                    //             totalWorkDay += 1;
                    //             totalLate += irts.late === true ? 1 : 0;
                    //             totalEarly += irts.early === true ? 1 : 0;
                    //             totalBreakDay += irts.reason === 'break' ? 1 : 0;
                    //             totalVacationDay += irts.reason === 'vacation' ? 1 : 0;
                    //         }
                    //     });
                    //     let retTotalWorkedHour = 0;
                    //     let retTotalWorkedMin = 0;
                    //     let retTotalWorkedSec = 0;
                    //     retTotalWorkedSec = totalWorkedSec % 60;
                    //     retTotalWorkedMin = totalWorkedMin + Math.floor(totalWorkedSec / 60);
                    //     retTotalWorkedHour = totalWorkedHour + Math.floor(retTotalWorkedMin / 60);
                    //     retTotalWorkedMin = retTotalWorkedMin % 60;
                    //     ret.workedHour = retTotalWorkedHour;
                    //     ret.workedMin = retTotalWorkedMin;
                    //     ret.workedSec = retTotalWorkedSec;
                    //     ret.noYvsanHour = noYvsanHour;
                    //     ret.totalWorkDay = totalWorkDay;
                    //     ret.totalArrivedDay = totalArrivedDay;
                    //     ret.totalBreakDay = totalBreakDay;
                    //     ret.totalVacationDay = totalVacationDay;
                    //     ret.totalLate = totalLate;
                    //     ret.totalEarly = totalEarly;
                    // });

                    return res.status(200).json({ success:true,
                        selected_month:req.query.selected_month,
                        month:month,
                        year:year,
                        results0:results[0],
                        results1:results[1],
                        results2:results[2], results3:results[3],
                        // attendance:(returnItem || []),
                        days:days,
                        selectedMonth:req.query.selected_month,
                        all: results[4],
                        search: search
                        // allWorkingHour:(days || []).length * 8
                    });
                });
            } else {
                return res.status(200).json({ success:false, msg:locale("error") });
            }
        });
    });
    router.get('/getAttendanceAll', auth.employee, function(req, res){

        let hadAction = (((req.employee || {}).role || {}).actions || []).some((c) => ['see_attendance'].indexOf(c) > -1);
        let hasAccess = ((req.employee || {}).staticRole === 'lord' || (req.employee || {}).staticRole === 'hrManager' || (req.employee || {}).staticRole === 'chairman')
            || hadAction;

        let {pageNum, pageSize, search} = req.query;
        pageNum = parseInt(pageNum) || 0;
        pageSize = parseInt(pageSize) || 20;
        let filter = [{staticRole: {$in: ['lord', 'employee', 'hrManager', 'chairman']}}, {company: {$in: [...(req.subsidiaries || []), req.company._id]}}, {status:'active'}];
        let regex = new RegExp(".*"+search+'.*', "i");
        User.find({$expr:{
                $or:[
                    {$regexMatch:{
                            "input": "$first_name",
                            "regex": regex
                        }},
                    {$regexMatch:{
                            "input": "$last_name",
                            "regex": regex
                        }},
                    {$regexMatch:{
                            "input": "$username",
                            "regex": regex
                        }},
                    {$regexMatch:{
                            "input": "email",
                            "regex": regex
                        }},
                    {$regexMatch: {
                            "input": {"$toString": "$phone"},
                            "regex": regex
                        }}
                ]
            }, status: 'active'}).distinct('_id', function(err, users) {
            if(err){
                let month = new Date(req.query.selected_month).getMonth()+1;
                let year  = new Date(req.query.selected_month).getFullYear();
                let days = (getAllDaysInMonth(month-1, year) || []);
                return res.json({success: true, attendance: [], days: days, selectedMonth: req.query.selected_month, all: 0})
            }
            if(req.query.selected_month){
                let month = new Date(req.query.selected_month).getMonth()+1;
                let year  = new Date(req.query.selected_month).getFullYear();
                let start_date = new Date(req.query.selected_month);
                let end_date = new Date(req.query.selected_month);
                end_date.setMonth(end_date.getMonth()+1);
                let days = (getAllDaysInMonth(month-1, year) || []);



                let massAttendanceQu = {};
                let breakFindQu = {};
                let vacationFindQu = {};
                if(!hasAccess){
                    massAttendanceQu = {employee:req.employee._id};
                    filter = [{_id:req.employee._id}];
                    breakFindQu = {'employee.emp':req.employee._id};
                    vacationFindQu = {'employee.emp':req.employee._id};
                }else {
                    if(search && search !== ''){
                        filter.push({user: {$in: users}});
                    }
                }

                async.parallel([
                    function (callback){
                        MassAttendance.aggregate([
                            {$match:{
                                    $and:[
                                        {company: {$in: [...(req.subsidiaries || []), req.company._id]}},
                                        {$or:[
                                                {'status':{$eq:'active'}},
                                                {'status':{$eq:'default'}},
                                            ]},
                                        {'localTime':{$gte:start_date}},
                                        {'localTime':{$lte:end_date}},
                                        massAttendanceQu
                                    ]
                                }},
                            {$project:{
                                    _id:1,
                                    company:1,
                                    created:1,
                                    employee:1,
                                    status:1,
                                    user:1,
                                    timetable:1,
                                    localTime:1,
                                    byManager:1,
                                    manager:1,
                                    reason:1,
                                    dayOfWeek:{$isoDayOfWeek:{$toDate:{
                                                $dateToString: {
                                                    date: '$localTime',
                                                    timezone: '+08:00'
                                                }
                                            }}},
                                    year:{$year:{$toDate:{
                                                $dateToString: {
                                                    date: '$localTime',
                                                    timezone: '+08:00'
                                                }
                                            }}},
                                    month:{$month:{$toDate:{
                                                $dateToString: {
                                                    date: '$localTime',
                                                    timezone: '+08:00'
                                                }
                                            }}},
                                    day:{$dayOfMonth:{$toDate:{
                                                $dateToString: {
                                                    date: '$localTime',
                                                    timezone: '+08:00'
                                                }
                                            }}},
                                    hour:{$hour:{$toDate:{
                                                $dateToString: {
                                                    date: '$localTime',
                                                    timezone: '+08:00'
                                                }
                                            }}},
                                    minute:{$minute:{$toDate:{
                                                $dateToString: {
                                                    date: '$localTime',
                                                    timezone: '+08:00'
                                                }
                                            }}},
                                }},
                            // {$match:{'dayOfWeek':{$nin:[6, 7]}}},

                            {
                                $lookup:
                                    {
                                        from: "timetables",
                                        let: { id: "$timetable" },
                                        pipeline: [
                                            { $match:
                                                    { $expr:
                                                            { $and:
                                                                    [
                                                                        { $eq: [ "$_id",  "$$id" ] },
                                                                    ]
                                                            }
                                                    }
                                            },
                                        ],
                                        as: "timetable"
                                    }
                            },
                            { $unwind: { path: "$timetable", preserveNullAndEmptyArrays: true } },
                            {$sort:{
                                    localTime:1
                                }},
                            {$group:{
                                    _id:{employee:'$employee', year:'$year', month:'$month', day:'$day', dayOfWeek:'$dayOfWeek' },
                                    activeAtt:{$push:{
                                            $cond: { if: { $eq: [ "$status", 'active' ] }, then: '$$ROOT', else: null }
                                        }},
                                    defaultAtt:{$push:{
                                            $cond: { if: { $eq: [ "$status", 'default' ] }, then: '$$ROOT', else: null }
                                        }}
                                }},
                        ])
                            .allowDiskUse(true)
                            .exec(function (err, data) {
                                callback(err, data || []);
                            })
                    },
                    function (callback){
                        Employee.find({$and: filter}, {_id:1, user:1, staticRole:1, status:1, timetable:1, company: 1}).skip(pageNum*pageSize).limit(pageSize).deepPopulate(['user', 'company']).lean().exec(function (err, data) {
                            callback(err, data || []);
                        })
                    },
                    function (callback){
                        Break.find({
                            $and: [{company:{$in: [...(req.subsidiaries || []), req.company._id]}}, breakFindQu, {status:'approved'}, {$or: [
                                    {$and:[ {starting_date:{$gte:start_date}} , {starting_date:{$lte:end_date}} ]},
                                    {$and:[ {ending_date:{$gte:start_date}} , {ending_date:{$lte:end_date}}
                                        ]}
                                ]}]
                        })
                            .lean().exec(function (err, data) {
                            callback(err, data || []);
                        })
                    },
                    function (callback){
                        Vacation.find({
                            $and: [{company:{$in: [...(req.subsidiaries || []), req.company._id]}}, vacationFindQu, {status: 'approved'}, {$or: [
                                    {$and:[ {starting_date:{$gte:start_date}} , {starting_date:{$lte:end_date}} ]},
                                    {$and:[ {ending_date:{$gte:start_date}} , {ending_date:{$lte:end_date}}
                                        ]}
                                ]}]
                        })
                            .lean().exec(function (err, data) {
                            callback(err, data || []);
                        })
                    },
                    function (callback){
                        Employee.countDocuments({$and: filter},).lean().exec(function (err, data) {
                            callback(err, data || []);
                        })
                    },
                ], function (err, results) {
                    if(err){
                        winston.error('/getAttendance err', err);
                        return res.status(200).json({success:false, msg: locale("system_err")});
                    }

                    return res.status(200).json({ success:true,
                        selected_month:req.query.selected_month,
                        month:month,
                        year:year,
                        results0:results[0],
                        results1:results[1],
                        results2:results[2], results3:results[3],
                        days:days,
                        selectedMonth:req.query.selected_month,
                        all: results[4],
                        search: search
                    });
                });
            } else {
                return res.status(200).json({ success:false, msg:locale("error") });
            }
        });
    });
    router.post('/editAttendance', (req, res, next) => auth.company(req, res, next, ['see_attendance']), function (req, res){
        const {
            id,
            localTime,
            reason,
            editting,
            employee,
            user,
            timetable
        } = req.body || {}
        if(!localTime) {
            return res.json({success: false, msg: locale("attendace_routers_all.choose_time")})
        } else if(localTime && !isValidDate(localTime)) {
            return res.json({success: false, msg: locale("attendace_routers_all.check_time")})
        } else {
            if(id && isId(id)) { //edit
                MassAttendance.findOne({_id: id, company: {$in: [...(req.subsidiaries || []), req.company._id]}, status: 'active'}).deepPopulate(['timetable']).exec(function (err, att){
                    if(err){
                        winsErr(req, res, '/editAttendance')
                        return res.json({success: false, sucmod: false, msg: locale("system_err")})
                    }
                    if(att){
                        att.backup = !(att.backup) ? att.localTime : att.backup
                        att.localTime = localTime
                        att.reason = reason
                        att.byManager = true
                        att.manager.emp = req.employee._id
                        att.manager.user = req.user._id
                        att.save((err, newAtt) => {
                            if(err) {winsErr(req, res, 'attendance.save()')}
                            return res.json({success: !(err), sucmod: !(err), attendance: newAtt, editting: editting, msg: (err ? locale("attendace_routers_all.edit_attendance_error") : locale("attendace_routers_all.edit_attendance_success"))})
                        })
                    } else {
                        return res.json({success: false, sucmod: false, msg: locale("attendace_routers_all.attendance_not_found")})
                    }
                })
            } else { //new
                if(isId(employee) && isId(user)){
                    // {$in: [...(req.subsidiaries || []), req.company._id]}
                    Employee.findOne({_id: employee, status: {$nin: ['delete', 'fired']}}).lean().exec(function(err, emp){
                        if(err){
                            winsErr(req, res, 'employee.find() - attendance.save()');
                            return res.json({success: false, msg: locale("system_err")});
                        }
                        let att = new MassAttendance()
                        att.employee = employee
                        att.user = user
                        att.company = emp.company
                        att.status = 'active'
                        att.localTime = localTime
                        att.byManager = true
                        att.manager.emp = req.employee._id
                        att.manager.user = req.user._id
                        att.reason = reason
                        att.timetable = isId(timetable) || null
                        att.save((err, newAtt) => {
                            if(err) {winsErr(req, res, 'attendance.save()')}
                            return res.json({success: !(err), sucmod: !(err), attendance: newAtt, editting: (editting === 'yvsan' ? 'newYvsan' : 'newIrsen'), msg: (err ? locale("attendace_routers_all.edit_attendance_error") : locale("attendace_routers_all.edit_attendance_success"))})
                        })
                    });
                } else {
                    return res.json({success: false, msg: locale("choose_employee")})
                }
            }
        }
    })
};

// function calTotalWorkHour(startingHour, endingHour){
//     let startHour = startingHour.split(':');
//     let endHour = startingHour.split(':');
//     let a = parseInt((startHour || [])[0] || '0');
//     let aa = parseInt((startHour || [])[1] || '0');
//     let b = parseInt((endHour || [])[0] || '0');
//     let bb = parseInt((endHour || [])[1] || '0');
//     let totA = (a*60+aa);
//     let totB = (b*60+bb);
//     if( totB > totA ){
//
//     }
//     if(aa < bb){
//         a -= 1;
//     }
//     return date.getDay();
// }
function getDayOfWeek(year, month, day){
    let date = new Date(year+ '/' + month+ '/' +day);
    return date.getDay() === 0? 7 : date.getDay();
}
function daysInMonth(iMonth, iYear){
    return 32 - new Date(iYear, iMonth, 32).getDate();
}
function isWeekday(year, month, day) {
    let days = new Date(year, month, day).getDay();
    return days !=0 && days !=6;
}

function getWeekdaysInMonth(month, year) {
    let days = daysInMonth(month, year);
    let weekdays = 0;
    let weekdaysArr = [];
    for(let i=0; i< days; i++) {
        if (isWeekday(year, month, i+1)) {weekdays++; weekdaysArr.push(i+1);}
    }
    return weekdaysArr;
}
function getAllDaysInMonth(month, year) {
    let days = daysInMonth(month, year);
    let weekdays = 0;
    let weekdaysArr = [];
    let date = new Date();
    let nowDay = date.getDate() -1;
    let nowMonth = date.getMonth();
    let nowYear = date.getFullYear();
    for(
        let i=0;
        i< days && (
            year < nowYear
            ||
            (year === nowYear && month < nowMonth )
            ||
            (year === nowYear && month === nowMonth && i <=nowDay )
        );
        i++
    ) {
        weekdays++; weekdaysArr.push(i+1);
    }
    return weekdaysArr;
}
// function getDatesBetweenDates(startDate, endDate){
//     let dates = [];
//     const theDate = new Date(startDate);
//     while (theDate < endDate) {
//         dates = [...dates, new Date(theDate.toDateString())];
//         theDate.setDate(theDate.getDate() + 1)
//     }
//     return dates
// }
// function checkIfDayInGap(yearMonth, day, days=[]){
//     console.log(days);
//     let check = false;
//     if(yearMonth && day && days && days.length > 0){
//         let date = new Date(yearMonth+'/'+day);
//         (days || []).map(function (r) {
//             if((new Date(r.toDateString()) || 'aa').toString() === (new Date(date.toDateString()) || 'bb').toString()){
//                 check = true;
//             }
//         });
//     }
//     return check
// }