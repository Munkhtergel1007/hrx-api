let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);

// Ажил төлөвлөлтийн таг chuluu
const Workplan_tag = mongoose.Schema({
    company: {type: ObjectId, ref: 'Company'},
    // workers: [{emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}}],
    title: {type: String, required:true},
    color: {type: String, required:true},
    desc: {type: String},
    created_by: {emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}},
    created: {type: Date, default: Date.now},
    updated_by: {action: {type: String, enum: ['updated, deleted']}, emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}, date:{type:Date}},
    status:{type:String, enum:['active', 'deleted']},
    // sub_tags: [{type: ObjectId, ref: 'SubTag'}]
});


Workplan_tag.plugin(deepPopulate, {
    whitelist: ['created_by.emp', 'created_by.user', 'updated_by.emp', 'updated_by.user', 'company'],
    populate: {
        // 'sub_tags':{
        //     select:'_id title desc color status'
        // },
        'created_by.emp':{
            select:'_id staticRole'
        },
        'created_by.user':{
            select:'_id first_name last_name'
        },
        'updated_by.emp':{
            select:'_id staticRole'
        },
        'updated_by.user':{
            select:'_id first_name last_name'
        },
        'company':{
            select:'_id domain name phone email logo'
        },
    }
});


module.exports = mongoose.model('Workplan_tag', Workplan_tag);