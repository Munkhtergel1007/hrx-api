let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);

// job worker
const Work_plan_job = mongoose.Schema({
    company: {type:ObjectId, ref:'Company'},
    work_plan: {type:ObjectId, ref: 'Work_plan'},
    created_by: {emp:{type:ObjectId, ref:'Employee'}, user:{type:ObjectId, ref:'User'}}, //JOB OWNER
    title: {type: String},
    desc: {type: String},
    check_lists: [{title: {type:String}, bool:{type:Boolean}, demo:{type:Boolean} }],
    work_dates: [{type:Date}],
    gallery: {type:ObjectId, ref:'Media'},
    status:{type:String, enum:['idle', 'checking', 'approved', 'decline', 'deleted'], default:'idle'},
    created: {type:Date, default:Date.now},
    subTag: {type: ObjectId, ref: 'SubTag'},


    type: {type: String, enum:['main', 'extra'], default:'extra'},


    comment: {type: String}, // manager comment if he decline
    completion: {type: Number},
    approved_by: {emp:{type:ObjectId, ref:'Employee'}, user:{type:ObjectId, ref:'User'}, date:{type:Date}}, //JOB OWNER
});


Work_plan_job.plugin(deepPopulate, {
    whitelist: ['worker.emp', 'worker.user', 'company', 'Work_plan', 'gallery', 'subTag', 'subTag.parent_tag'],
    populate: {
        'worker.emp': {
            select: '_id staticRole'
        },
        'subTag': {
            select: '_id title desc'
        },
        'subTag.parent_tag': {
            select: '_id title desc color'
        },
        'worker.user': {
            select: '_id first_name last_name'
        },
        'company':{
            select:'_id domain name phone email logo'
        },
        'work_plan':{
            select:'_id year_month comment status'
        },
        'gallery':{
            select:'_id type path status'
        },
    }
});


module.exports = mongoose.model('Work_plan_job', Work_plan_job);