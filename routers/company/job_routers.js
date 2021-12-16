import auth from '../../auth'
import Job from '../../models/Job'
import Job_worker from '../../models/Job_worker'
import {winsErr, isId, string} from '../../config'
import async from "async";
import {locale} from "../../lang";

module.exports = function (router) {
    router.post('/get/job/:employee', (req, res, next) => auth.company(req, res, next, []), function(req, res){
        const {
            employee
        } = req.params || {}
        let reqComp = req.company || {}
        async.parallel({
            allJobs: function(callback) {
                // Job.find({'created_by.emp': isId(employee), status: {$ne: 'deleted'}}).deepPopulate(['created_by.emp', 'created_by.user', 'subTag']).sort({created: -1}).exec(function(err, job){
                //     callback(err, job)
                // })
                Job.aggregate([
                    {$match: {'created_by.emp': isId(employee), status: {$ne: 'deleted'}}},
                    {$lookup: {
                        from: 'job_workers',
                        let: {
                            job: '$_id',
                            // emp: '$created_by.emp'
                        },
                        pipeline: [{
                            $match: {
                                $expr: {
                                    $and: [
                                        {$eq: ['$job', '$$job']},
                                        {$ne: ['$status', 'deleted']},
                                    ]
                                }
                            },
                        },
                        {$sort: {created: -1}}
                        ],
                        as: 'jobWorkers'
                    }},
                    {$project: {
                        _id: 1,
                        created_by: 1,
                        title: 1,
                        desc: 1,
                        comment: 1,
                        subTag: 1,
                        year_month: 1,
                        gallery: 1,
                        status: 1,
                        job_workers: '$jobWorkers'
                    }},
                    {$sort: {created: -1}}
                ], (err, data) => {
                    callback(err, data)
                })
            },
            allJobWorkers: function (callback){
                Job_worker.find({'worker.emp': isId(employee)}).exec(function(err, jobworkers){
                    callback(err, jobworkers)
                })
            }
        }, function(err, data){
            if(err) {winsErr(req, res, 'get jobs async cb')}
            if(data){
                return res.json({success: !(err), jobs: data.allJobs, jobworkers: data.allJobWorkers})
            } else {
                return res.json({success: false})
            }
        })
    })
    router.post('/edit/job', (req, res, next) => auth.company(req, res, next, []), function (req, res){
        const {
            title,
            desc,
            subTag,
            year_month,
            id
        } = req.body || {}
        let reqComp = req.company || {}
        let reqEmp = req.employee || {}
        let reqUser = req.user || {}
        if(id && isId(id)) { // edit
            Job.findOneAndUpdate(
                {_id: id, status: {$ne: 'deleted'}},
                {title: title, desc: desc, subTag: subTag, year_month: year_month, updated: Date.now()},
                {new: true}
            ).deepPopulate(['created_by.emp', 'created_by.user', 'subTag']).exec(function(err, job){
                if(err) {winsErr(req, res, 'Job.fineOneAndUpdate() edit')}
                if(job) {
                    return res.json({success: !(err), job: job, id: id, msg: (err ? locale("job_routers_all.job_edit_error") : locale("job_routers_all.job_edit_success"))})
                } else {
                    return res.json({success: false, msg: locale("job_routers_all.job_not_found")})
                }
            })
        } else { // create
            let job = new Job()
            job.company = reqComp._id
            job.created_by.emp = reqEmp._id
            job.created_by.user = reqUser._id
            job.title = string(title)
            job.desc = string(desc)
            job.subTag = subTag
            job.year_month = year_month
            job.status = 'active'
            job.save((err, newJob) => {
                if(err) {winsErr(req, res, 'job.save()')}
                if(newJob) {
                    return res.json({success: true, job: newJob, msg: (err ? locale("job_routers_all.job_addition_error") : locale("job_routers_all.job_addition_success"))})
                } else {
                    return res.json({success: false, msg: locale("job_routers_all.job_addition_error")})
                }
            })
        }
    })
    router.post('/delete/job', (req, res, next) => auth.company(req, res, next, []), function (req, res){
        const {
            id
        } = req.body || {}
        Job_worker.updateMany(
            {job: id},
            {status: 'deleted'},
            {new: true}
        ).exec(function (err, worker){
            if(err){
                winsErr(req, res, 'Job_worker updateMany()')
                return res.json({success: false, msg: locale("job_routers_all.job_deletion_error")})
            }
            Job.findOneAndUpdate(
                {_id: id},
                {status: 'deleted', updated: Date.now()},
                {new: true}
            ).exec(function(err, job){
                if(err) {winsErr(req, res, 'Job delete')}
                if(job) {
                    return res.json({success: !(err), id: id, msg: (err ? locale("job_routers_all.job_deletion_error") : locale("job_routers_all.job_deletion_success"))})
                } else {
                    return res.json({success: false, msg: locale("job_routers_all.job_not_found")})
                }
            })
        })
    })
    router.post('/edit/jobworker', (req, res, next) => auth.company(req, res, next, []), function(req, res) {
        const {
            id,
            job,
            emp,
            user,
            // cost,
            title,
            check_lists,
            work_dates
        } = req.body || {}
        let reqComp = req.company || {}
        let reqEmp = req.employee || {}
        if(id && isId(id)){
            Job.findOne(
                {_id: job},
                {created_by: 1}
            ).exec(function (err, job){
                if(err){winsErr(req, res, 'job.findOne()')}
                if(job){
                    if(job.created_by.emp === reqComp._id) {
                        Job_worker.findOneAndUpdate(
                            {_id: id, status: {$ne: 'deleted'}},
                            {'worker.emp': emp, 'worker.user': user, title: title, check_lists: check_lists, work_dates: work_dates},
                            {new: true}
                        ).exec(function(err, jobworker){
                            if(err) {winsErr(req, res, 'job_worker.findOneAndUpdate()')}
                            if(jobworker){
                                return res.json({success: !(err), jobworker: jobworker, job: job, msg: (err ? locale("job_routers_all.job_edit_error") : locale("job_routers_all.job_edit_success"))})
                            } else {
                                return res.json({success: false, msg: locale("job_routers_all.job_not_found")})
                            }
                        })
                    } else {
                        return res.json({success: false, msg: locale("cannot_access")})
                    }
                } else {
                    return res.json({success: false, msg: locale("job_routers_all.job_not_found")})
                }
            })
        } else {
            let jw = new Job_worker()
            jw.company = reqComp._id
            jw.job = job
            jw.worker.emp = emp
            jw.worker.user = user
            jw.title = title
            jw.check_lists = check_lists
            // jw.cost = cost
            jw.work_dates = work_dates
            jw.status = 'active'
            jw.save((err, newJw) => {
                if(err) {winsErr(req, res, 'jobworker.save()')}
                if(newJw){
                    return res.json({success: true, jobworker: newJw, job: job, msg: locale("job_routers_all.job_worker_addition_success")})
                } else {
                    return res.json({success: false, msg: locale("job_routers_all.job_worker_addition_error")})
                }
            })
        }
    })
    router.post('/edit/jobworker/status', (req, res, next) => auth.company(req, res, next, []), function (req, res){
        const {
            id,
            job,
            status
        } = req.body || {}
        let reqEmp = req.employee || {}
        Job_worker.findOneAndUpdate(
            {_id: id},
            {status: status},
            {new: true}
        ).exec(function(err, jobworker){
            if(err){winsErr(req, res, 'job_worker.findOneAndUpdate')}
            if(jobworker){
                if(status === 'deleted'){
                    return res.json({success: !(err), job: job, id: id, jobworker: jobworker, msg: (err ? locale("job_routers_all.job_deletion_error") : locale("job_routers_all.job_deletion_success"))})
                } else {
                    return res.json({success: !(err), job: job, id: id, jobworker: jobworker, msg: (err ? locale("job_routers_all.job_edit_error") : locale("job_routers_all.job_edit_success"))})
                }
            } else {
                return res.json({success: false, msg: locale("job_routers_all.job_not_found")})
            }
        })
    })
}