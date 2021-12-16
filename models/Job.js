let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);

// Ажил job
const Job = mongoose.Schema({
    company: {type: ObjectId, ref: 'Company'},
    created_by: {emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}},
    title: {type: String},
    desc: {type: String},
    comment: {type: String}, // Ajil shalgagchaas ilgeesen comment
    subTag: [{type: ObjectId, ref: 'SubTag'}],
    year_month: [{type:Date}],
    gallery: {type: ObjectId, ref: 'Media'},
    status:{type:String, enum:['active', 'checking', 'declined', 'finished', 'deleted'], default:'active'}, // manager finished
    created: {type: Date, default: Date.now},
    updated: {type:Date},
});


Job.plugin(deepPopulate, {
    whitelist: ['created_by.emp', 'created_by.user', 'company', 'gallery', 'subTag'],
    populate: {
        'created_by.emp': {
            select: '_id staticRole'
        },
        'created_by.user': {
            select: '_id first_name last_name'
        },
        'company':{
            select:'_id domain name phone email logo'
        },
        'gallery':{
            select:'_id type path status'
        },
        'subTag':{
            select:'_id title desc'
        }
    }
});


module.exports = mongoose.model('Job', Job);