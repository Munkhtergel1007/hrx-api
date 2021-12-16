let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);

const Holiday = mongoose.Schema({
    company: {type: ObjectId, ref: 'Company'},
    approved_by: {emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}},
    created: {type: Date, default: Date.now},
    selected_dates: [{type: Date}],
    title: {type: String},
    employees: [{type: ObjectId, ref: 'Employee'}]
});

Holiday.plugin(deepPopulate, {
    whitelist: ['company', 'approved_by.emp', 'approved_by.user'],
    populate: {
        'approved_by.emp':{
            select:'_id staticRole'
        },
        'approved_by.user':{
            select:'_id first_name last_name'
        },
        'company':{
            select:'_id domain name phone email logo'
        },
    }
});


module.exports = mongoose.model('Holiday', Holiday);