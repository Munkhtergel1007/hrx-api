import Work_plan from '../../models/Work_plan'
import Work_plan_job from '../../models/Work_plan_job'
import async from 'async'
import auth from '../../auth'
import { isId, isValidDate, winsErr, string, actionsKeys } from '../../config';
import winston from 'winston';
import moment from 'moment'
let mongoose = require('mongoose')
const {ObjectId} = mongoose.Types;
import {locale} from "../../lang";

module.exports = function(router){
    router.get('/get/own/workplans', auth.employee, function(req, res){
        Work_plan.aggregate([
            {$match: {"created_by.emp": req.employee._id, status: {$ne: 'deleted'}}},
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
                        {$sort: {created: 1}}
                    ],
                    as: 'jobs'
                }},
            {$project: {
                    _id: 1,
                    company: 1,
                    created_by: 1,
                    year_month: 1,
                    created: 1,
                    status: 1,
                    comment: 1,
                    approved_by: 1,
                    jobs: '$jobs'
                }},
            {$sort: {created: -1}}
        ], function(err, workplans){
            if(err){winsErr(req, res, 'workplan aggregate()')}
            return res.json({success: !(err), workplans: workplans})
        })
    })
    router.post('/edit/workplan', (req, res, next) => auth.company(req, res, next, []), function(req, res){
        const {
            id,
            year_month
        } = req.body || {}
        let reqComp = req.company || {}
        let reqEmp = req.employee || {}
        let reqUser = req.user || {}
        let date = moment(year_month).format('YYYY-MM').split('-')
        function saveWorkplan(){
            if(id && isId(id)){
                // Work_plan.findOneAndUpdate({_id})
            } else {
                let wp = new Work_plan()
                wp.company = reqComp._id
                wp.created_by.emp = reqEmp._id
                wp.created_by.user = reqUser._id
                wp.year_month = year_month
                wp.status = 'idle'
                wp.save((err, newWp) => {
                    if(err) {winsErr(req, res, 'workplan.save()')}
                    if(newWp){
                        return res.json({success: !(err), workplan: newWp, msg: (err ? locale("workplan_routers_all.workplan_edit_error") : locale("workplan_routers_all.workplan_edit_success"))})
                    } else {
                        return res.json({success: false, msg: locale("workplan_routers_all.workplan_edit_error")})
                    }
                })
            }
        }
        Work_plan.find({'created_by.emp': reqEmp._id, status: {$ne: 'deleted'}}).exec(function (err, plans){
            if(err){winsErr(req, res, 'workplan count()'); return res.json({success: false, msg: locale("system_err")})}
            if(plans) {
                if(plans.some(c => {
                    let aa = moment(c.year_month).format('YYYY-MM').split('-')
                    return aa[0] === date[0] && aa[1] === date[1]
                })){
                    return res.json({success: false, msg: locale("workplan_routers_all.workplan_month_exists")})
                } else {
                    saveWorkplan()
                }
            } else {
                saveWorkplan()
            }
        })
    })
    router.post('/delete/workplan', (req, res, next) => auth.company(req, res, next, []), function(req, res){
        const {
            id
        } = req.body || {}
        Work_plan_job.updateMany(
            {work_plan: id, status: {$in: ['idle', 'decline']}},
            {status: 'deleted'}
        ).exec(function (err, jobs){
            if(err){
                winsErr(req, res, 'workplan job updateMany()')
                return res.json({success: false, msg: locale("system_err")})
            } else {
                Work_plan.findOneAndUpdate(
                    {_id: id, status: {$in: ['idle', 'decline']}},
                    {status: 'deleted'},
                    {new: true}
                ).exec(function (err, workplan){
                    if(err){winsErr(req, res, 'workplan job findOneAndUpdate()')}
                    if(workplan){
                        return res.json({success: !(err), id: id, msg: (err ? locale("workplan_routers_all.workplan_delete_error") : locale("workplan_routers_all.workplan_delete_success"))})
                    } else {
                        return res.json({success: false, msg: locale("workplan_routers_all.workplan_delete_error")})
                    }
                })
            }
        })
    })
    router.post('/edit/workplan/job', (req, res, next) => auth.company(req, res, next, []), function (req, res){
        const {
            id,
            title,
            desc,
            subTag,
            check_lists,
            work_dates,
            work_plan,
            type
        } = req.body || {}
        let reqComp = req.company || {}
        let reqEmp = req.employee || {}
        let reqUser = req.user || {}
        if(id && isId(id)){
            Work_plan.exists({_id: work_plan, status: {$ne: 'deleted'}}, function (err, workplan){
                Work_plan_job.findOneAndUpdate(
                    {_id: id, status: {$ne: 'deleted'}},
                    {title: title, desc: desc, subTag: subTag || null, check_lists: check_lists, work_dates: work_dates},
                    {new: true}
                ).exec(function(err, job){
                    if(err){winsErr(req, res, 'workplan job edit')}
                    if(job){
                        return res.json({success: !(err), job: job, id: id, work_plan: work_plan, msg: (err ? locale("workplan_routers_all.workplan_job_edit_error") : locale("workplan_routers_all.workplan_job_edit_success"))})
                    } else {
                        return res.json({success: false, msg: locale("workplan_routers_all.workplan_job_not_found")})
                    }
                })
            })
        } else {
            let job = new Work_plan_job()
            job.company = reqComp._id
            job.work_plan = work_plan
            job.created_by.emp = reqEmp._id
            job.created_by.user = reqUser._id
            job.title = title
            job.desc = desc
            job.check_lists = check_lists
            job.work_dates = work_dates
            job.status = 'idle'
            job.subTag = subTag || null
            job.type = type
            job.save((err, newJob) => {
                if(err){winsErr(req, res, 'job.save()')}
                if(newJob){
                    return res.json({success: !(err), work_plan: work_plan, job: newJob, msg: (err ? locale("workplan_routers_all.workplan_job_edit_error") : null)})
                } else {
                    return res.json({success: false, msg: locale("workplan_routers_all.workplan_job_edit_error")})
                }
            })
        }
    })
    router.post('/delete/workplan/job', (req, res, next) => auth.company(req, res, next, []), function(req, res){
        const {
            work_plan,
            id
        } = req.body || {}
        Work_plan_job.findOneAndUpdate(
            {_id: id, status: {$in: ['idle', 'decline']}},
            {status: 'deleted'},
            {new: true}
        ).exec(function (err, job){
            if(err){winsErr(req, res, 'workplan job delete')}
            if(job) {
                return res.json({success: !(err), work_plan: work_plan, id: id, msg: (err ? locale("workplan_routers_all.workplan_job_delete_error") : locale("workplan_routers_all.workplan_job_delete_success"))})
            } else {
                return res.json({success: false, msg: locale("workplan_routers_all.workplan_job_not_found")})
            }
        })
    })
    router.post('/submit/workplan', (req, res, next) => auth.company(req, res, next, []), function(req, res){
        const {
            id,
            status
        } = req.body || {}
        if(status === 'checking'){
            Work_plan.findOneAndUpdate(
                {_id: id, status: {$in: ['idle', 'decline']}},
                {status: status},
                {new: true}
            ).exec(function(err, workplan){
                if(err){winsErr(req, res, 'submit workplan status')}
                if(workplan){
                    return res.json({success: !(err), status: status, id: id, msg: (err ? locale("error") : locale("success"))})
                } else {
                    return res.json({success: false, msg: locale("workplan_routers_all.workplan_not_found")})
                }
            })
        } else {
            Work_plan.findOneAndUpdate(
                {_id: id, status: 'checking'},
                {status: status},
                {new: true}
            ).exec(function(err, workplan){
                if(err){winsErr(req, res, 'submit workplan status')}
                if(workplan){
                    return res.json({success: !(err), status: status, id: id, msg: (err ? locale("error") : locale("success"))})
                } else {
                    return res.json({success: false, msg: locale("workplan_routers_all.workplan_not_found")})
                }
            })
        }
    })
    router.post('/get/workplans', (req, res, next) => auth.company(req, res, next, []), function (req, res){
        const reqComp = req.company
        const {
            year_month,
            status, company, pageSize, pageNum
        } = req.body || {}
        let dDay = year_month.split('-');
        let filter = [
            {$ne:['$status', 'deleted']},
            {$eq:[{$year:'$year_month'} , parseInt(dDay[0])]},
            {$eq:[{$month:'$year_month'} , parseInt(dDay[1])]},
            status === 'all' ? {$ne:['$status', 'deleted']} : {$eq:['$status', status]}
        ];
        if(company && company !== '' && company !== 'all'){
            filter = [...filter, {$eq:['$company', ObjectId(company)]}];
        }else{
            filter = [...filter, {$in:['$company', [...(req.subsidiaries || []),ObjectId(reqComp._id)]]}];
        }
        async.parallel({
            workplans: function(cb){
                Work_plan.aggregate([
                    {$match: {
                            $expr:{
                                $and: filter
                            }
                        }},
                    {$lookup: {
                            from: 'companies',
                            let: {
                                work_plan: '$company',
                                // emp: '$created_by.emp'
                            },
                            pipeline: [{
                                $match: {
                                    $expr: {
                                        $and: [
                                            {$eq: ['$_id', '$$work_plan']},
                                        ]
                                    }
                                },
                            },
                                {$sort: {created: -1}}
                            ],
                            as: 'company'
                        }},
                    {$unwind:'$company'},
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
                    {$lookup: {
                            from: 'employees',
                            let: {id: '$created_by.emp'},
                            pipeline: [
                                {$match: {$expr: {$eq: ['$_id', '$$id']}}},
                                {$project: {_id: 1, staticRole: 1, role: 1}}
                            ],
                            as: 'emp'
                        }},
                    {$lookup: {
                            from: 'users',
                            let: {id: '$created_by.user'},
                            pipeline: [
                                {$match: {$expr: {$eq: ['$_id', '$$id']}}},
                                {$project: {_id: 1, first_name: 1, last_name: 1, avatar: 1}}
                            ],
                            as: 'user'
                        }},
                    {$project: {
                            _id: 1,
                            company: 1,
                            'created_by.emp': {$arrayElemAt: ['$emp', 0]},
                            'created_by.user': {$arrayElemAt: ['$user', 0]},
                            year_month: 1,
                            created: 1,
                            status: 1,
                            comment: 1,
                            approved_by: 1,
                            jobs: '$jobs'
                        }},
                    {$sort: {created: -1}},
                    {$skip: parseInt(pageSize)*parseInt(pageNum)},
                    {$limit: parseInt(pageSize)}
                ], function(err, workplans){
                    cb(err, workplans)
                })
            },
            total: function(cb){
                Work_plan.countDocuments({$expr: {$and: filter}}).exec(function(err, totals){
                    cb(err, totals);
                })
            }
        }, function (err, data) {
            if(err){winsErr(req, err, 'workplan aggregate()')}
            return res.json({success: !(err), workplans: data.workplans, all: data.total})
        })
    })
    router.post('/respond/workplan', (req, res, next) => auth.company(req, res, next, []), function (req, res){
        const {
            id,
            status,
            comment
        } = req.body || {}
        Work_plan.findOneAndUpdate(
            {_id: id, status: 'checking'},
            {status: status, 'approved_by.emp': req.employee._id, 'approved_by.user': req.user._id, comment: comment},
            {new: true}
        ).exec(function(err, workplan){
            if(err){winsErr(req, res, 'workplan respond')}
            if(workplan){
                return res.json({success: !(err), workplan: workplan, msg: (err ? locale("error") : locale("success"))})
            } else {
                return res.json({success: false, msg: locale("error")})
            }
        })
    })
    router.post('/submit/workplan/job', (req, res, next) => auth.company(req, res, next, []), function (req, res){
        const {
            id,
            status,
            work_plan
        } = req.body || {}
        Work_plan.findOne({_id: work_plan, status: 'approved'}).exec(function (err, plan){
            if(err){winsErr(req, res, 'submit job workplan findOne')}
            if(plan){
                Work_plan_job.findOneAndUpdate(
                    {_id: id, status: {$nin: ['approved', 'deleted']}},
                    {status: status},
                    {new: true}
                ).exec(function (err, job){
                    if(err){winsErr(req, res, 'job findOneAndUpdate')}
                    if(job){
                        return res.json({success: !(err), job: job, work_plan: work_plan, msg: (err ? locale("error") : locale("success"))})
                    } else {
                        return res.json({success: false, msg: locale("error")})
                    }
                })
            } else {
                return res.json({success: false, msg: locale("workplan_routers_all.accepted_job_not_found")})
            }
        })
    })
    router.post('/appraise/workplan/job', (req, res, next) => auth.company(req, res, next, []), function (req, res){
        const {
            id,
            comment,
            completion,
            work_plan
        } = req.body || {}
        if(completion === ''){
            return res.json({success: false, msg: locale("workplan_routers_all.percent_required")})
        } else {
            Work_plan.findOne({_id: work_plan, status: 'approved'}).exec(function (err, plan){
                if(err){winsErr(req, res, 'appraise job workplan findOne')}
                if(plan){
                    Work_plan_job.findOneAndUpdate(
                        {_id: id, status: 'checking'},
                        {status: 'approved', comment: comment, completion: completion, 'approved_by.emp': req.employee._id, 'approved_by.user': req.user._id},
                        {new: true}
                    ).exec(function (err, job){
                        if(err){winsErr(req, res, 'job findOneAndUpdate')}
                        if(job){
                            return res.json({success: !(err), job: job, work_plan: work_plan, msg: (err ? locale("error") : locale("success"))})
                        } else {
                            return res.json({success: false, msg: locale("workplan_routers_all.workplan_job_not_found")})
                        }
                    })
                } else {
                    return res.json({success: false, msg: locale("workplan_routers_all.accepted_job_not_found")})
                }
            })
        }
    })
    router.post('/decline/workplan/job', (req, res, next) => auth.company(req, res, next, []), function (req, res){
        const {
            id,
            comment,
            work_plan
        } = req.body || {}
        Work_plan.findOne({_id: work_plan, status: 'approved'}).exec(function (err, plan){
            if(err){winsErr(req, res, 'appraise job workplan findOne')}
            if(plan){
                Work_plan_job.findOneAndUpdate(
                    {_id: id, status: 'checking'},
                    {status: 'decline', comment: comment},
                    {new: true}
                ).exec(function (err, job){
                    if(err){winsErr(req, res, 'job findOneAndUpdate')}
                    if(job){
                        return res.json({success: !(err), job: job, work_plan: work_plan, msg: (err ? locale("error") : locale("success"))})
                    } else {
                        return res.json({success: false, msg: locale("workplan_routers_all.workplan_job_not_found")})
                    }
                })
            } else {
                return res.json({success: false, msg: locale("workplan_routers_all.accepted_job_not_found")})
            }
        })
    })
}