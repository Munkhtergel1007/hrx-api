let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);

// Ажил job
const OrlogoZarlagaSchema = mongoose.Schema({
    company: {type: ObjectId, ref: 'Company'},
    created_by: {emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}},

    title: {type: String},
    description: {type: String},
    date: {type: Date}, // Guilgee hiigsen udur
    startingDate: {type: Date}, // tuhain tulburiin hamrah huree   /facebook boost bailaa gehed boost ehelsen udur/
    endingDate: {type: Date}, // tuhain tulburiin hamrah huree     /facebook boost bailaa gehed boost duusah udur/
    amount: {type: Number},
    subTag: {type: ObjectId, ref:'SubTag'},
    type: {type: String, enum:['orlogo', 'zarlaga']},

    status:{type:String, enum:['active', 'deleted'], default:'active'},
    created: {type: Date, default: Date.now},
});


OrlogoZarlagaSchema.plugin(deepPopulate, {
    whitelist: ['created_by.emp', 'created_by.user', 'company'],
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
    }
});


module.exports = mongoose.model('OrlogoZarlaga', OrlogoZarlagaSchema);