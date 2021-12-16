import auth from "../../auth";
import Company from "../../models/Company";
import User from "../../models/User";
import Employee from "../../models/Employee";
import Break from '../../models/Break';
import Vacation from '../../models/Vacation';
import MassAttendance from '../../models/MassAttendance';
import Work_plan from '../../models/Work_plan'
import Work_plan_job from '../../models/Work_plan_job'
import async from 'async';
import {winsErr, isId, isPhoneNum, string, isValidDate, checkIfDayInGap, getDatesBetweenDates} from '../../config';
import moment from 'moment'
import {locale} from "../../lang";
const mongoose = require('mongoose');
let ObjectId = mongoose.Types.ObjectId;

module.exports = function (router) {
    router.get('/get/employeeUsers', (req, res, next) => auth.company(req, res, next, ['create_employee', 'edit_employee']), function (req, res) {
        let date = new Date();
        async.parallel({
            allCount: function(cb){
                Employee.countDocuments({status: {$nin: ['delete', 'fired']}, staticRole: {$in: ['employee', 'hrManager']}, company: req.company._id}).exec(function(err, empC) {
                    cb(err, empC)
                })
            },
            allEmployees: function (cb) {
                Employee.find({status: {$nin: ['delete', 'fired']}, staticRole: {$in: ['employee', 'hrManager']}, company: req.company._id}).populate('user').deepPopulate('timetable').lean().exec(function(err, employees) {
                    cb(err, employees)
                })
            },
            // todaysAttendance: function(cb) {
            //     let startingz = new Date();
            //     let endingz = new Date();
            //     startingz.setHours(0, 0, 0, 0);
            //     endingz.setHours(0, 0, 0, 0);
            //     endingz.setDate( endingz.getDate() + 1 );
            //     endingz.setMilliseconds( endingz.getMilliseconds() - 1 );
            //     // let rangePickerQu = {$and:[{localTime: {$gte: startingz}} , {localTime: {$lte: endingz}}]};
            //     MassAttendance.find({$and: [{status: 'active'}, {$and:[{localTime: {$gte: startingz}}, {localTime: {$lte: endingz}}]}, {company: {$in: [...(req.subsidiaries || []), req.company._id]}}]}).exec(function(err, attendance){
            //         cb(err, attendance)
            //     })
            // }
            todaysAttendance: function(cb){
                let startingz = new Date();
                let endingz = new Date();
                startingz.setHours(0, 0, 0, 0);
                endingz.setHours(0, 0, 0, 0);
                endingz.setDate( endingz.getDate() + 1 );
                endingz.setMilliseconds( endingz.getMilliseconds() - 1 );
                // MassAttendance.find({$and: [{company: req.company._id}, {status: 'active'}, {$and:[{localTime: {$gte: startingz}}, {localTime: {$lte: endingz}}]}]}, {employee: 1}).distinct('employee', function(err, ids){
                //     cb(err, ids)
                // })
                // MassAttendance.aggregate([
                //     {$match: {
                //             $and: [
                //                 {'company':req.company._id},
                //                 {'status':'active'},
                //                 {'localTime': {$gte: startingz}},
                //                 {'localTime': {$lte: endingz}},
                //             ]
                //         }},
                //     {$group:{
                //             // _id: {employee: '$employee', user: '$user'},
                //             _id: '$employee',
                //             irsen:{$first:'$$ROOT'},
                //             yvsan:{$last:'$$ROOT'}
                //         }},
                //     {
                //         $lookup:
                //             {
                //                 from: "users",
                //                 let: { id: "$_id.user" },
                //                 pipeline: [
                //                     { $match:
                //                             { $expr:
                //                                     { $and:
                //                                             [
                //                                                 { $eq: [ "$_id",  "$$id" ] },
                //                                             ]
                //                                     }
                //                             }
                //                     },
                //                     { $project: { _id: 1, last_name: 1, first_name: 1 } }
                //                 ],
                //                 as: "userAttendance"
                //             }
                //     }
                // ]).exec(function(err, att){
                //     cb(err, att)
                // })
                MassAttendance.aggregate([
                    {
                        $match:
                            {
                                $and: [
                                    {'company':req.company._id},
                                    {'status':'active'},
                                    {'localTime': {$gte: startingz}},
                                    {'localTime': {$lte: endingz}},
                                ]
                            }},
                    {
                        $lookup:
                            {
                                from: "timetables",
                                let: { id: "$timetable" },
                                pipeline: [
                                    { $match:
                                            { $expr:
                                                    { $eq: [ "$_id",  "$$id" ] }
                                            }
                                    },
                                    { $project: { days: 1 } }
                                ],
                                as: "time"
                            }},
                    {
                        $project: {
                            employee: true,
                            localTime: true,
                            time: {$arrayElemAt: ['$time', 0]}
                        }
                    },
                    {
                        $group:
                            {
                                _id: '$employee',
                                irsen: {$first:'$$ROOT'}
                            }},
                ]).exec(function(err, att){
                    cb(err, att)
                })
            },
            allTimetable: function(cb){
                Employee.find({status: {$nin: ['delete', 'fired']}, staticRole: {$in: ['employee', 'hrManager']}, company: req.company._id}, {timetable: 1}).deepPopulate('timetable').exec(function(err, timetables){
                    cb(err, timetables)
                })
            },
            allBreaks: function(cb){
                Break.find({status: 'approved', company: req.company._id, starting_date: {$lte: date}, ending_date: {$gte: date}}, {'employee.emp': 1, reason: 1, starting_date: 1, ending_date: 1}).exec(function(err, brks){
                    cb(err, brks)
                })
            },
            allVacation: function(cb){
                Vacation.find({status: 'approved', company: req.company._id, starting_date: {$lte: date}, ending_date: {$gte: date}}).exec(function(err, vac){
                    cb(err, vac);
                })
            }
        }, function(err, data){
            let employees = [];
            let vacations = [];
            let breaks = [];
            if(err) {
                winsErr(req, res, '/get/employeeUsers')
            }
            if(data) {
                if(!data.allEmployees || (data.allEmployees || []).length === 0){
                    return res.json({success: false});
                }
                let dayDictionary = {0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday'};
                let deg = {baga: -3, dund: -2, burendund: -1, other: 1, diplomiin: 2, bachelor: 3, magistr: 4, dr: 5};
                let today = new Date(), age;
                let todayDay = dayDictionary[today.getDay()];
                let estimated = new Date();
                estimated.setHours(9);
                estimated.setMinutes(0);
                let young = 0, avg = 0, older = 0, old = 0, avgAge = 0;
                let maleCount = 0, femaleCount = 0;
                let allDiplom = 0, allBachelor = 0, allMagistr = 0, allDr = 0, allOther = 0, allEmpty = 0, hasTimetable;
                let married = 0, training = 0, experience = 0, military = 0;
                (data.allEmployees || []).map(user => {
                    let temp = new Date((user.user || {}).birthday);
                    hasTimetable = false;
                    if(isValidDate(temp)){
                        age = today.getFullYear() - temp.getFullYear();
                        if(age >= 18 && age <= 25){
                            young++;
                        }else if(age > 25 && age <= 40){
                            avg++;
                        }else if(age > 40 && age <=55){
                            older++;
                        }else if(age > 55){
                            old++;
                        }
                        avgAge += age;
                    }
                    let at = 0, date;
                    if(user.timetable){
                        hasTimetable = true;
                    }
                    (data.todaysAttendance || []).map(att => {
                        if((att._id || '').toString() === (user._id || '').toString()){
                            at = 1;
                            date = (att.irsen || {}).localTime;
                            if((att.irsen || {}).timetable){
                                (((att.irsen || {}).time || {}).days || []).map(day => {
                                    if(day.title === todayDay){
                                        let [starting_hour, starting_minute] = (day.startingHour).split(":");
                                        if((parseInt(starting_hour) > ((att.irsen || {}).localTime || estimated).getHours()) ||
                                            (parseInt(starting_hour) === ((att.irsen || {}).localTime || estimated).getHours() && parseInt(starting_minute) > ((att.irsen || {}).localTime || estimated).getMinutes())){
                                            at = 2;
                                        }
                                    }
                                })
                            }else{
                                if(todayDay === 'sunday' || todayDay === 'saturday'){
                                    at = 0;
                                }else{
                                    at = 1;
                                    if((10 > ((att.irsen || {}).localTime || estimated).getHours()) ||
                                        (10 === ((att.irsen || {}).localTime || estimated).getHours() && 0 === ((att.irsen || {}).localTime || estimated).getMinutes())){
                                        at = 2;
                                    }
                                }
                            }
                        }
                    });
                    if(at === 0){
                        (data.allTimetable || []).map(employ => {
                            ((employ.timetable || {}).days || []).map(day => {
                                if(day.title === todayDay){
                                    at = 3;
                                }
                            })
                        });
                    }
                    if((user.user || {}).first_name && (user.user || {}).last_name){
                        if(date && isValidDate(date)){
                            employees.push({_id: user._id, first_name: ((user.user || {}).first_name || ''), last_name: ((user.user || {}).last_name || ''), att: at, cameTime: date, hasTimetable: (hasTimetable || false)});
                        }else{
                            employees.push({_id: user._id, first_name: ((user.user || {}).first_name || ''), last_name: ((user.user || {}).last_name || ''), att: at, hasTimetable: (hasTimetable || false)});
                        }
                    }
                    if((user.user || {}).gender){
                        if((user.user || {}).gender === 'male') maleCount++;
                        else if((user.user || {}).gender === 'female')  femaleCount++;
                    }
                    if((user.user || {}).profession){
                        let max = 0;
                        (user.user || {}).profession.map(degree => {
                            if(deg[degree.type] > max){
                                max = deg[degree.type];
                            }
                        });
                        switch (max) {
                            case 1: allOther++; break;
                            case 2: allDiplom++; break;
                            case 3: allBachelor++; break;
                            case 4: allMagistr++; break;
                            case 5: allDr++; break;
                            case 0: allEmpty++; break;
                        }
                    }
                    if((user.user || {}).family){
                        if((user.user || {}).family.isMarried === true){
                            married++;
                        }
                    }
                    if((user.user || {}).qualification_training){
                        if((user.user || {}).qualification_training.length > 0){
                            training++;
                        }
                    }
                    if((user.user || {}).work_experience){
                        if((user.user || {}).work_experience.length > 0){
                            experience++;
                        }
                    }
                    if((user.user || {}).wasInmilitary){
                        military++;
                    }
                });
                (data.allVacation || []).map(vac => {
                    if(vac){
                        let days = [];
                        if(vac.selected_dates && (vac.selected_dates || []).length > 0){
                            days = vac.selected_dates;

                        }else{
                            days = getDatesBetweenDates(vac.starting_date, vac.ending_date);
                        }
                        if(checkIfDayInGap(date, days)){
                            vacations.push({_id: (vac.employee || {}).emp, starting_date: vac.selected_dates[0], ending_date: vac.selected_dates[((vac.selected_dates || []).length || 1)-1]});
                        }
                    }
                });
                (data.allBreaks || []).map(brk => {
                    if(brk){
                        breaks.push({_id: (brk.employee || {}).emp, starting_date: brk.starting_date, ending_date: brk.ending_date, reason: brk.reason})
                    }
                });
                return res.json({
                    success: !(err),
                    data: {
                        age: { young: young, avg: avg, older: older, old: old, avgAge: avgAge/data.allCount },
                        gender: { male: maleCount, female: femaleCount },
                        degree: { dr: allDr, magistr: allMagistr, bachelor: allBachelor, diplom: allDiplom, other: allOther, empty: allEmpty },
                        married: married,
                        training: training,
                        experience: experience,
                        military: military
                    },
                    all: data.allCount,
                    attendance: (data.todaysAttendance || []),
                    breaks: (breaks || []),
                    vacations: (vacations || []),
                    employees: (employees || [])
                });
            } else {
                return res.json({success: false})
            }
        });

    })

    router.get('/get/workplans/employee', (req, res, next) => auth.employee(req, res, next), function(req, res){
        const {employeeId, companyId} = req.query;
        let past = new Date();
        let now = new Date();
        past.setSeconds(0);
        past.setMinutes(0);
        past.setHours(0);
        past.setDate(0);
        past.setMilliseconds(0);
        past.setMonth(past.getMonth()-4);
        now.setSeconds(0);
        now.setMinutes(0);
        now.setHours(0);
        now.setDate(0);
        now.setMilliseconds(0);
        now.setMilliseconds(now.getMilliseconds()-1);
        now.setMonth(now.getMonth()+1);
        if(employeeId){
            Work_plan.aggregate([
                {$match: {'created_by.emp': ObjectId(employeeId), status: {$ne: 'deleted'}, $and: [{year_month: {$gte: past}}, {year_month: {$lte: now}}]}},
                {$lookup: {
                        from: 'work_plan_jobs',
                        let: {
                            work_plan: '$_id',
                            // emp: '$created_by.emp'
                        },
                        pipeline: [{
                            $match: {
                                $expr: {
                                    $and: [
                                        {$eq: ['$work_plan', '$$work_plan']},
                                        {$ne: ['$status', 'deleted']},
                                    ]
                                }
                            },
                        },
                            {$sort: {created: -1}}
                        ],
                        as: 'jobs'
                    }},
                {$unwind: '$jobs'},
                {$lookup: {
                        from: 'subtags',
                        let: {
                            id: '$jobs.subTag',
                        },
                        pipeline: [{
                            $match: {
                                $expr: {
                                    $and: [
                                        {$eq: ['$_id', '$$id']},
                                        {$ne: ['$status', 'deleted']},
                                    ]
                                }
                            },
                        }],
                        as: 'jobs.subTag'
                    }},
                {$unwind: {path: '$jobs.subTag', preserveNullAndEmptyArrays: true}},
                {$lookup: {
                        from: 'workplan_tags',
                        let: {
                            id: '$jobs.subTag.parent_tag',
                        },
                        pipeline: [{
                            $match: {
                                $expr: {
                                    $and: [
                                        {$eq: ['$_id', '$$id']},
                                        {$ne: ['$status', 'deleted']},
                                    ]
                                }
                            },
                        }],
                        as: 'jobs.subTag.parent_tag'
                    }},
                {$unwind: {path: '$jobs.subTag.parent_tag', preserveNullAndEmptyArrays: true}},
                {$project: {
                        _id: 1,
                        year_month: 1,
                        status: 1,
                        comment: 1,
                        approved_by: 1,
                        // color: '$jobs.subTag.parent_tag.color',
                        jobs: {
                            check_lists: 1,
                            desc: 1,
                            status: 1,
                            title: 1,
                            type: 1,
                            work_dates: 1,
                            subTag: 1,
                            completion: 1,
                            comment: 1
                            //     {
                            //     color: '$parent_tag.color'
                            // }
                        }
                    }},
                {$group: {
                        _id: '$_id',
                        year_month: {$first: '$year_month'},
                        status: {$first: '$status'},
                        comment: {$first: '$comment'},
                        jobs: {$push: '$jobs'},
                        // all: {$push: '$$ROOT'}
                    }},
                {$sort: {year_month: -1}}
            ]).exec(function(err, workplans){
                if(err){
                    winsErr(req, res, 'workplan aggregate()');
                    return res.json({success: false, msg: locale("system_err")});
                }
                return res.json({success: true, workplans: workplans, emp: true})
            })
        }else{
            Work_plan.find({$and: [{status: {$ne: 'deleted'}}, {$and:[{year_month: {$gte: past}}, {year_month: {$lte: now}}]}, {company: companyId || (req.company || {})._id}]}, {status: 1, year_month: 1}).lean().exec(function(err, workplans){
                if(err){
                    winsErr(req, res, 'work_plan find()');
                    return res.json({success: false, msg: `${locale("system_err")} 1`});
                }
                if(workplans){
                    let ids = [], months = [], computedWorkPlans = {};
                    (workplans || []).map(workplan => {
                        if(workplan._id && (workplan._id || '').length !== 0){
                            let date = new Date(workplan.year_month);
                            ids.push(workplan._id);
                            if(date && isValidDate(date)){
                                computedWorkPlans[`${date.getMonth()+1}`] = [];
                            }
                        }
                    });
                    if(ids && (ids || []).length > 0){
                        Work_plan_job.find({status: {$ne: 'deleted'}, company: (companyId || (req.company || {})._id), work_plan: {$in: (ids || [])}}, {status: 1, work_plan: 1}).lean().exec(function(err, jobs){
                            if(err){
                                winsErr(req, res, 'work_plan_job find()');
                                return res.json({success: false, msg: `${locale("system_err")} 2`});
                            }
                            if(jobs){
                                workplans = (workplans || []).map(workplan => {
                                    let temp = {'approved': 0, 'declined': 0, 'checking': 0, 'idle': 0, all: 0, error: 0};
                                    (jobs || []).map(job => {
                                        if(((job || {}).work_plan || 'as').toString() === ((workplan || {})._id || 'wd').toString()){
                                            temp[((job || {}).status || 'error')]++;
                                            (temp || {}).all++
                                        }
                                    });
                                    return {
                                        ...workplan,
                                        jobs: temp
                                    };
                                });
                                if((workplans || []).length > 0){
                                    (workplans || []).map(workplan => {
                                        let date = new Date(workplan.year_month);
                                        if(isValidDate(date)){
                                            computedWorkPlans[`${date.getMonth()+1}`].push(workplan)
                                        }
                                    });
                                    if(computedWorkPlans && (Object.keys(computedWorkPlans) || []).length > 0){
                                        return res.json({success: true, workplans: (computedWorkPlans || {}), emp: false});
                                    }else{
                                        return res.json({success: false});
                                    }
                                }else{
                                    return res.json({success: false});
                                }
                            }else{
                                return res.json({success: false});
                            }
                        })
                    }else{
                        return res.json({success: false});
                    }
                }else{
                    return res.json({success: false});
                }
            })
        }
    })
};