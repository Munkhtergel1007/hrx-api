let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);

// job worker
const Job_worker = mongoose.Schema({
    company: {type:ObjectId, ref:'Company'}, //JOB OWNER
    job: {type:ObjectId, ref: 'Job'}, //JOB OWNER
    worker: {emp:{type:ObjectId, ref:'Employee'}, user:{type:ObjectId, ref:'User'}}, //JOB OWNER
    title: {type: String},  //JOB OWNER
    check_lists: [{title: {type:String}, bool:{type: Boolean, default: false}}],
    // cost: {type:Number}, //JOB OWNER
    work_dates: [{type:Date}], //JOB OWNER
    gallery: {type:ObjectId, ref:'Media'},
    status:{type:String, enum:['active', 'finished', 'deleted'], default:'active'},
    created: {type:Date, default:Date.now},
});


Job_worker.plugin(deepPopulate, {
    whitelist: ['worker.emp', 'worker.user', 'company', 'job', 'gallery'],
    populate: {
        'worker.emp': {
            select: '_id staticRole'
        },
        'worker.user': {
            select: '_id first_name last_name'
        },
        'company':{
            select:'_id domain name phone email logo'
        },
        'job':{
            select:'_id title'
        },
        'gallery':{
            select:'_id type path status'
        },
    }
});


module.exports = mongoose.model('Job_worker', Job_worker);