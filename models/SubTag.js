let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);

const SubTag = mongoose.Schema({
    company: {type: ObjectId, ref: 'Company'},
    // workers: [{emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}}],
    title: {type: String, required:true},
    // color: {type: String, required:true},
    desc: {type: String},
    created_by: {emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}},
    created: {type: Date, default: Date.now},
    updated_by: {action: {type: String, enum: ['update, delete']}, emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}, date:{type:Date}},
    status:{type:String, enum:['active', 'deleted']},
    parent_tag: {type: ObjectId, ref: 'Workplan_tag'}
})

SubTag.plugin(deepPopulate, {
    whitelist: ['parent_tag', 'created_by.emp', 'created_by.user', 'updated_by.emp', 'updated_by.user'],
    populate: {
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
        'parent_tag':{
            select: '_id title status desc color'
        }
    }
});

module.exports = mongoose.model('SubTag', SubTag);